# Cost Estimate — Project 1: CI/CD Pipeline with Live Observability

All prices are based on AWS eu-west-1 (Ireland) pricing as of 2025.
Costs assume minimal demo-state usage — not production traffic levels.

---

## Monthly cost breakdown (idle / demo state)

| Service | What drives the cost | Idle estimate | Active demo estimate |
|---|---|---|---|
| **ALB** | $0.008/LCU-hour + $0.0252/hour base | ~$1.20/month | ~$1.50/month |
| **ECS Fargate** | 0.25 vCPU + 512MB RAM, 1 task | ~$0.90/month | ~$1.20/month |
| **NAT Gateway** | $0.045/hour + $0.045/GB data | ~$0.50/month | ~$1.00/month |
| **ECR** | $0.10/GB/month storage, ~50MB images | ~$0.01/month | ~$0.01/month |
| **CodePipeline** | $1.00/active pipeline/month (1 pipeline) | ~$1.00/month | ~$1.00/month |
| **CodeBuild** | 100 free minutes/month on SMALL; ~$0.005/min after | ~$0.00/month | ~$0.25/month |
| **CodeDeploy** | Free for ECS deployments | $0.00 | $0.00 |
| **CloudWatch** | Logs ingestion $0.50/GB, dashboards $3/dashboard/month | ~$0.10/month | ~$0.30/month |
| **CloudWatch Alarms** | $0.10/alarm/month, 3 alarms | ~$0.30/month | ~$0.30/month |
| **X-Ray** | First 100k traces/month free | ~$0.00/month | ~$0.00/month |
| **SNS** | First 1M publishes free | ~$0.00/month | ~$0.00/month |
| **S3 (artifacts)** | $0.023/GB/month, minimal data | ~$0.01/month | ~$0.01/month |
| **WAF** | $5.00/WebACL/month + $1.00/rule/month | ~$6.00/month | ~$6.00/month |
| **Route 53** | $0.50/hosted zone/month (shared across all projects) | ~$0.08/month | ~$0.08/month |
| **ACM** | Free | $0.00 | $0.00 |
| **VPC** | Free (no extra charge for VPC itself) | $0.00 | $0.00 |
| **GitHub Actions** | Free tier (2000 min/month on public repos) | $0.00 | $0.00 |
| **TOTAL** | | **~$10–12/month** | **~$12–15/month** |

> Note: WAF is the single largest cost driver at ~$6/month for the WebACL alone.
> If you want to reduce cost during idle periods, delete the WAF WebACL and recreate it before demos.
> Without WAF: ~$4–6/month idle.

---

## Cost reduction tactics applied

| Tactic | Saving |
|---|---|
| Fargate desired count = 1 (not auto-scaling up unless needed) | Prevents runaway task costs |
| ECS max desired count capped at 4 | Prevents flood-triggered scaling spend |
| ECR lifecycle policy: keep last 5 images only | Prevents storage accumulation |
| S3 artifact lifecycle: delete after 30 days | Prevents storage accumulation |
| CloudWatch log retention set to 30 days | Prevents indefinite log storage charges |
| CodeBuild instance: BUILD_GENERAL1_SMALL | Cheapest build tier sufficient for this workload |
| CloudWatch billing alarm at $15 | Catches unexpected spend before invoice |
| WAF rate rule (not managed rules) | Managed rule groups cost $1/rule/month each; a single rate rule is cheaper |

---

## Teardown savings

Running `cdk destroy --all` after a demo session eliminates:

| Resource destroyed | Monthly saving |
|---|---|
| ALB | ~$1.20 |
| Fargate tasks | ~$0.90 |
| NAT Gateway | ~$0.50 |
| WAF WebACL | ~$6.00 |
| **Total saving if torn down between demos** | **~$8.60/month** |

Teardown command:
```bash
cd infra && cdk destroy --all
```

Redeploy command:
```bash
cd infra && cdk deploy --all --require-approval never
```

---

## Free tier coverage (first 12 months)

| Service | Free tier benefit |
|---|---|
| Lambda | 1M requests + 400k GB-seconds/month (used in future projects) |
| DynamoDB | 25GB storage + 25 WCU/RCU (used in future projects) |
| S3 | 5GB storage + 20k GET + 2k PUT/month |
| CloudWatch | 10 custom metrics, 5GB log ingestion, 3 dashboards |
| SNS | 1M publishes/month |
| X-Ray | 100k traces/month |
| CodeBuild | 100 build minutes/month on BUILD_GENERAL1_SMALL |

> ALB, Fargate, NAT Gateway, WAF, and CodePipeline have **no free tier** —
> these are the services to destroy between demos.

---

## Cost monitoring

This project is monitored by the Project 5 Cost Dashboard at `cost.faroukhasnaoui.tech`.
All resources are tagged `Project=1` so Cost Explorer shows per-project spend.

A CloudWatch billing alarm fires an SNS email when estimated charges exceed **$15/month**.
