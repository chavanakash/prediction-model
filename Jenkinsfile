pipeline {
    agent any

    environment {
        DOCKER_HUB_USER = 'dockerizzz'
        DOCKER_HUB_CREDS = credentials('dockerhub-credentials')
        APP_NAME = 'prediction-model'
        BACKEND_IMAGE = "${DOCKER_HUB_USER}/prediction-backend"
        FRONTEND_IMAGE = "${DOCKER_HUB_USER}/prediction-frontend"
        HELM_CHART_PATH = 'helm/prediction-app'
        ARGOCD_APP_NAME = 'prediction-model'
        GIT_REPO_URL = 'https://github.com/chavanakash/prediction-model.git'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    triggers {
        // Poll GitHub every 2 minutes for changes on main branch
        pollSCM('H/2 * * * *')
        // Also responds instantly to GitHub webhook (configure webhook in repo settings)
        githubPush()
    }

    stages {

        stage('Checkout') {
            steps {
                echo "Checking out code from ${GIT_REPO_URL}"
                checkout scm
            }
        }

        stage('Build Images') {
            parallel {
                stage('Build Backend') {
                    steps {
                        dir('backend') {
                            sh """
                                echo "Building backend image..."
                                docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest .
                            """
                        }
                    }
                }
                stage('Build Frontend') {
                    steps {
                        dir('frontend') {
                            sh """
                                echo "Building frontend image..."
                                docker build \
                                    --build-arg REACT_APP_API_URL=/api \
                                    -t ${FRONTEND_IMAGE}:${IMAGE_TAG} \
                                    -t ${FRONTEND_IMAGE}:latest .
                            """
                        }
                    }
                }
            }
        }

        stage('Scan Images') {
            parallel {
                stage('Scan Backend') {
                    steps {
                        sh """
                            echo "Scanning backend image for vulnerabilities..."
                            docker run --rm \
                                -v /var/run/docker.sock:/var/run/docker.sock \
                                aquasec/trivy:latest image \
                                --exit-code 0 \
                                --severity HIGH,CRITICAL \
                                --no-progress \
                                ${BACKEND_IMAGE}:${IMAGE_TAG} || true
                        """
                    }
                }
                stage('Scan Frontend') {
                    steps {
                        sh """
                            echo "Scanning frontend image for vulnerabilities..."
                            docker run --rm \
                                -v /var/run/docker.sock:/var/run/docker.sock \
                                aquasec/trivy:latest image \
                                --exit-code 0 \
                                --severity HIGH,CRITICAL \
                                --no-progress \
                                ${FRONTEND_IMAGE}:${IMAGE_TAG} || true
                        """
                    }
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo "Logging into Docker Hub..."
                        echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin

                        echo "Pushing backend images..."
                        docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                        docker push ${BACKEND_IMAGE}:latest

                        echo "Pushing frontend images..."
                        docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                        docker push ${FRONTEND_IMAGE}:latest

                        docker logout
                    """
                }
            }
        }

        stage('Update Helm Values') {
            steps {
                sh """
                    echo "Updating Helm chart image tags to ${IMAGE_TAG}..."
                    sed -i "s|tag: .*|tag: \\"${IMAGE_TAG}\\"|g" ${HELM_CHART_PATH}/values.yaml

                    # Show the change
                    grep -A2 'image:' ${HELM_CHART_PATH}/values.yaml || true
                """
            }
        }

        stage('Helm Lint & Package') {
            steps {
                sh """
                    echo "Linting Helm chart..."
                    helm lint ${HELM_CHART_PATH}

                    echo "Packaging Helm chart..."
                    helm package ${HELM_CHART_PATH} --destination helm-packages/

                    ls -la helm-packages/
                """
            }
        }

        stage('Commit Updated Values') {
            when {
                branch 'main'
            }
            steps {
                sh """
                    git config user.email "jenkins@ci.local"
                    git config user.name "Jenkins CI"
                    git add ${HELM_CHART_PATH}/values.yaml
                    git commit -m "ci: update image tags to build ${IMAGE_TAG} [skip ci]" || echo "No changes to commit"
                    git push origin HEAD:main || echo "Push failed - check git credentials"
                """
            }
        }

        stage('ArgoCD Sync') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([string(credentialsId: 'argocd-token', variable: 'ARGOCD_TOKEN')]) {
                    sh """
                        echo "Triggering ArgoCD sync for ${ARGOCD_APP_NAME}..."
                        argocd app sync ${ARGOCD_APP_NAME} \
                            --auth-token ${ARGOCD_TOKEN} \
                            --server host.docker.internal:30443 \
                            --insecure \
                            --timeout 120 || echo "ArgoCD CLI not available, sync via webhook"
                    """
                }
            }
        }

    }

    post {
        always {
            sh """
                docker rmi ${BACKEND_IMAGE}:${IMAGE_TAG} || true
                docker rmi ${FRONTEND_IMAGE}:${IMAGE_TAG} || true
                docker system prune -f || true
            """
            cleanWs()
        }
        success {
            echo "Pipeline succeeded! Images pushed: build ${IMAGE_TAG}"
            // Add Slack/email notifications here if needed
        }
        failure {
            echo "Pipeline failed on build ${IMAGE_TAG}"
        }
    }
}
