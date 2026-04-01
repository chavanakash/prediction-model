# Jenkins Setup Guide

## Step 1 — Start Jenkins (Docker)

```bash
# From project root
docker-compose -f jenkins/docker-compose.jenkins.yml up -d

# Jenkins UI → http://localhost:8080
```

Get the initial admin password:
```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

---

## Step 2 — Install Plugins

Go to **Manage Jenkins → Plugins → Available plugins** and install:
- Pipeline (workflow-aggregator)
- Git
- Docker Pipeline
- Credentials Binding
- Blue Ocean (optional, nicer UI)

Or paste the list from `plugins.txt`.

---

## Step 3 — Add Credentials

Go to **Manage Jenkins → Credentials → System → Global credentials → Add Credential**

### Docker Hub credentials
| Field | Value |
|-------|-------|
| Kind | Username with password |
| ID | `dockerhub-credentials` |
| Username | `dockerizzz` |
| Password | Your Docker Hub access token |

### ArgoCD token
| Field | Value |
|-------|-------|
| Kind | Secret text |
| ID | `argocd-token` |
| Secret | Your ArgoCD API token |

> Get ArgoCD token: `argocd account generate-token --account admin`

---

## Step 4 — Create Pipeline Job

1. **New Item** → Pipeline → name it `prediction-model`
2. Under **Pipeline**:
   - Definition: `Pipeline script from SCM`
   - SCM: Git
   - Repository URL: `https://github.com/chavanakash/prediction-model.git`
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
3. Save → **Build Now**

---

## Step 5 — Configure Webhook (optional, auto-trigger)

In your GitHub repo:
- Settings → Webhooks → Add webhook
- Payload URL: `http://<your-jenkins-ip>:8080/github-webhook/`
- Content type: `application/json`
- Events: `push`

---

## What the Pipeline Does

```
1. Checkout         Pull latest code from Git
2. Build Images     docker build backend + frontend (parallel)
3. Scan Images      Trivy security scan (non-blocking)
4. Push to Hub      docker push → dockerizzz/prediction-backend:<build>
                                → dockerizzz/prediction-frontend:<build>
5. Update Helm      sed image tags in helm/prediction-app/values.yaml
6. Helm Lint        Validate chart syntax
7. Commit Values    Push updated values.yaml back to git (triggers ArgoCD)
8. ArgoCD Sync      argocd app sync prediction-model
```

---

## Verify Images After Build

```bash
docker pull dockerizzz/prediction-backend:latest
docker pull dockerizzz/prediction-frontend:latest
```
