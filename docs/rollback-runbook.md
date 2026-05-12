# Rollback Runbook — Project 1: CI/CD Pipeline with Live Observability

**Purpose:** Step-by-step guide for triggering a rollback when the automated
CodeDeploy rollback does not fire, or when you need to manually intervene
during a bad deployment.

**Last updated:** 2025
**Owner:** farouk
**Service:** ops.faroukhasnaoui.tech

---

## How automatic rollback works (no human action needed)

CodeDeploy monitors the CloudWatch alarm `ALB-5xx-Error-Rate` during every
blue/green deployment. The alarm triggers when:

- ALB HTTP 5xx error rate exceeds 5%
- For 2 consecutive evaluation periods (each 1 minute)

If the alarm enters ALARM state during the canary window (first 5 minutes
after shifting 10% of traffic to the green target group), CodeDeploy
automatically:

1. Stops routing any new traffic to the green (new) target group
2. Shifts 100% of traffic back to the blue (old) target group
3. Marks the deployment as FAILED with reason: CloudWatchAlarmRollback
4. Leaves the old task set running untouched

You will receive an SNS email notification when this happens.

---

## Scenario 1 — Automatic rollback did not fire (alarm missed)

Use this when a bad deployment completed successfully (100% traffic shifted
to green) but the application is behaving incorrectly and the alarm did not
catch it.

### Step 1 — Identify the last known good deployment ID

```bash
aws deploy list-deployments   --application-name portfolio-1-app   --deployment-group-name portfolio-1-deployment-group   --region eu-west-1   --query 'deployments[0:5]'   --output table
```

Note the deployment ID of the last SUCCEEDED deployment before the bad one
(format: d-XXXXXXXXX).

### Step 2 — Trigger a manual rollback via CodeDeploy console

1. Open the AWS Console → CodeDeploy → Applications → portfolio-1-app
2. Click the deployment group: portfolio-1-deployment-group
3. Find the bad deployment (status: Succeeded) and click into it
4. Click **Stop and roll back deployment**
5. Confirm — CodeDeploy shifts traffic back to the previous task set

### Step 2 (alternative) — Trigger rollback via CLI

```bash
aws deploy stop-deployment   --deployment-id d-XXXXXXXXX   --auto-rollback-enabled   --region eu-west-1
```

Replace d-XXXXXXXXX with the bad deployment ID from Step 1.

### Step 3 — Verify traffic is back on the old version

```bash
curl -s https://ops.faroukhasnaoui.tech/version
# Should return the previous version number, not the broken one
```

---

## Scenario 2 — ECS tasks are crash-looping (no healthy targets)

Use this when the ALB health check reports 0 healthy targets and the service
is completely down.

### Step 1 — Check ECS service events

```bash
aws ecs describe-services   --cluster portfolio-1-cluster   --services portfolio-1-service   --region eu-west-1   --query 'services[0].events[0:5]'   --output table
```

Look for lines like: "has stopped X running tasks" or "unable to place task".

### Step 2 — Check the task logs for the crash reason

```bash
# Get the stopped task ID
aws ecs list-tasks   --cluster portfolio-1-cluster   --desired-status STOPPED   --region eu-west-1   --query 'taskArns[0]'   --output text

# Then fetch its logs (replace TASK_ID)
aws logs get-log-events   --log-group-name /ecs/portfolio-1-app   --log-stream-name ecs/portfolio-1-app/TASK_ID   --region eu-west-1   --limit 50   --query 'events[*].message'   --output text
```

### Step 3 — Force the service to use the previous task definition revision

```bash
# List recent task definition revisions
aws ecs list-task-definitions   --family-prefix portfolio-1-app   --region eu-west-1   --sort DESC   --query 'taskDefinitionArns[0:5]'   --output table

# Force the service to use the previous revision (e.g. revision 3 if 4 is broken)
aws ecs update-service   --cluster portfolio-1-cluster   --service portfolio-1-service   --task-definition portfolio-1-app:3   --region eu-west-1
```

### Step 4 — Confirm new tasks are healthy

```bash
# Watch task status (run every 30 seconds)
aws ecs list-tasks   --cluster portfolio-1-cluster   --desired-status RUNNING   --region eu-west-1

# Confirm the endpoint is responding
curl -s https://ops.faroukhasnaoui.tech/health
# Expected: {"status":"ok"}
```

---

## Scenario 3 — Full pipeline is stuck (CodePipeline shows In Progress forever)

Use this when a pipeline execution has been running for more than 15 minutes
with no progress.

### Step 1 — Find the stuck execution ID

```bash
aws codepipeline list-pipeline-executions   --pipeline-name portfolio-1-pipeline   --region eu-west-1   --query 'pipelineExecutionSummaries[0:3]'   --output table
```

Note the pipelineExecutionId of the stuck execution.

### Step 2 — Stop the stuck execution

```bash
aws codepipeline stop-pipeline-execution   --pipeline-name portfolio-1-pipeline   --pipeline-execution-id EXECUTION_ID   --abandon   --reason "Manual stop: execution stuck"   --region eu-west-1
```

### Step 3 — Verify the current live version is still healthy

```bash
curl -s https://ops.faroukhasnaoui.tech/health
curl -s https://ops.faroukhasnaoui.tech/version
```

If healthy, the old version is still serving traffic — the stuck pipeline
did not affect the running service.

### Step 4 — Re-trigger the pipeline after fixing the root cause

```bash
aws codepipeline start-pipeline-execution   --name portfolio-1-pipeline   --region eu-west-1
```

---

## Post-rollback checklist

After any rollback scenario, complete all of these before closing the incident:

- [ ] Confirm `https://ops.faroukhasnaoui.tech/health` returns `{"status":"ok"}`
- [ ] Confirm `https://ops.faroukhasnaoui.tech/version` returns the expected previous version
- [ ] Check CloudWatch dashboard — ALB 5xx rate back below 1%
- [ ] Check ECS service desired count = running count (no stuck tasks)
- [ ] Resolve or acknowledge the CloudWatch alarm so it resets to OK state
- [ ] Document the root cause in a comment on the GitHub commit that caused the bad deploy
- [ ] Fix the bug in a new branch, test locally with `docker build` + `docker run`, then push

---

## Useful CloudWatch links

- **Live dashboard:** https://ops.faroukhasnaoui.tech/dashboard
- **ECS logs:** AWS Console → CloudWatch → Log Groups → /ecs/portfolio-1-app
- **CodeBuild logs:** AWS Console → CloudWatch → Log Groups → /aws/codebuild/portfolio-1-build
- **ALB metrics:** AWS Console → CloudWatch → Metrics → ApplicationELB

---

## Escalation

If none of the above resolves the issue within 30 minutes:

1. Check the AWS Service Health Dashboard: https://health.aws.amazon.com
2. Check eu-west-1 specifically — ECS and ALB outages are regional
3. If it is an AWS-side issue, wait for resolution — there is nothing to do
   on the application side until the underlying service recovers
