# TrendCast — AI Prediction Platform

A full-stack ML trend prediction web app. Upload CSV data, choose a regression model, and forecast future values with interactive charts.

## Stack
- **Frontend**: React 18, Recharts, React Dropzone
- **Backend**: Node.js, Express, `regression` (ML library)
- **Database**: PostgreSQL 16
- **CI/CD**: Jenkins → Docker Hub (`dockerizzz`) → ArgoCD
- **Deployment**: Helm charts on Kubernetes

## Supported Models
| Model | Best For |
|-------|----------|
| Auto (Best Fit) | Unknown data, auto-selects |
| Linear | Steady growth trends |
| Polynomial (2nd) | Curved / accelerating trends |
| Exponential | Viral / compound growth |
| Logarithmic | Diminishing returns |
| Power | Scaling relationships |

## Quick Start (Docker Compose)

```bash
cd prediction-model
docker-compose up --build
```

Open http://localhost:3000

## Local Development

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev        # runs on :5000
```

### Frontend
```bash
cd frontend
npm install
npm start          # runs on :3000
```

## CI/CD Pipeline

### Jenkins Setup
1. Add `dockerhub-credentials` (Username/Password) credential in Jenkins
2. Add `argocd-token` (Secret text) credential
3. Create pipeline job pointing to this repo's `Jenkinsfile`

### Pipeline Stages
```
Checkout → Build Images (parallel) → Scan → Push to Docker Hub
→ Update Helm values → Helm Lint & Package → ArgoCD Sync
```

### Docker Hub Images
- `dockerizzz/prediction-backend:<build-number>`
- `dockerizzz/prediction-frontend:<build-number>`

## Kubernetes Deployment

### ArgoCD Setup
```bash
# Create namespace
kubectl apply -f argocd/namespace.yaml

# Register app in ArgoCD
kubectl apply -f argocd/application.yaml

# Check sync status
argocd app get prediction-model
```

### Manual Helm Deploy
```bash
# Install
helm install prediction-model helm/prediction-app \
  --namespace prediction-model \
  --create-namespace

# Upgrade with new image tags
helm upgrade prediction-model helm/prediction-app \
  --set backend.image.tag=42 \
  --set frontend.image.tag=42
```

## Sample Data
Test CSVs are in `sample-data/`:
- `sales.csv` — weekly revenue data (date + revenue + units)
- `temperature.csv` — monthly temperature data

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/datasets | List all datasets |
| POST | /api/datasets/upload | Upload CSV |
| GET | /api/datasets/:id | Dataset + data points |
| DELETE | /api/datasets/:id | Delete dataset |
| POST | /api/predictions/:datasetId | Run prediction |
| GET | /api/predictions/dataset/:id | Predictions for dataset |
| GET | /api/predictions/:id | Single prediction result |
