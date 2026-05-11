import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecs from 'aws-cdk-lib/aws-ecs';

interface MonitoringStackProps extends cdk.StackProps {
    alb: elbv2.ApplicationLoadBalancer;
    ecsService: ecs.FargateService;
    albTargetGroup: elbv2.ApplicationTargetGroup;
}

export class MonitoringStack extends cdk.Stack {
    public readonly rollbackAlarm: cloudwatch.Alarm;

    constructor(scope: Construct, id: string, props: MonitoringStackProps) {
        super(scope, id, props);

        // ── 1. Log Groups ──────────────────────────────────────────────
        new logs.LogGroup(this, 'CodeBuildLogGroup', {
            logGroupName: '/codebuild/portfolio-1-pipeline',
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // ── 2. SNS Topic ───────────────────────────────────────────────
        const alertTopic = new sns.Topic(this, 'AlertTopic', {
            topicName: 'portfolio-1-alerts',
            displayName: 'Portfolio Project 1 Alerts',
        });

        alertTopic.addSubscription(
            new sns_subscriptions.EmailSubscription('mohamdfarouk727@gmail.com')
        );

        cdk.Tags.of(alertTopic).add('Project', '1');
        cdk.Tags.of(alertTopic).add('Environment', 'prod');
        cdk.Tags.of(alertTopic).add('Owner', 'farouk');

        // ── 3. Alarms ──────────────────────────────────────────────────

        // 3a. ALB 5xx error rate — used for CodeDeploy rollback trigger
        const alb5xxAlarm = new cloudwatch.Alarm(this, 'Alb5xxAlarm', {
            alarmName: 'portfolio-1-alb-5xx-rate',
            alarmDescription: 'ALB 5xx error rate > 5% for 2 minutes — triggers rollback',
            metric: new cloudwatch.MathExpression({
                expression: '(m1 / m2) * 100',
                usingMetrics: {
                    m1: props.alb.metrics.httpCodeElb(elbv2.HttpCodeElb.ELB_5XX_COUNT, {
                        period: cdk.Duration.minutes(1),
                        statistic: 'Sum',
                    }),
                    m2: props.alb.metrics.requestCount({
                        period: cdk.Duration.minutes(1),
                        statistic: 'Sum',
                    }),
                },
                period: cdk.Duration.minutes(1),
            }),
            threshold: 5,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

        alb5xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));
        this.rollbackAlarm = alb5xxAlarm;

        // 3b. ECS CPU > 80%
        const ecsCpuAlarm = new cloudwatch.Alarm(this, 'EcsCpuAlarm', {
            alarmName: 'portfolio-1-ecs-cpu-high',
            alarmDescription: 'ECS CPU utilisation > 80% for 5 minutes',
            metric: props.ecsService.metricCpuUtilization({
                period: cdk.Duration.minutes(1),
                statistic: 'Average',
            }),
            threshold: 80,
            evaluationPeriods: 5,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

        ecsCpuAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

        // ── 4. Dashboard ───────────────────────────────────────────────
        new cloudwatch.Dashboard(this, 'MainDashboard', {
            dashboardName: 'portfolio-1-ops',
            widgets: [
                [
                    new cloudwatch.GraphWidget({
                        title: 'ALB Request Count',
                        left: [props.alb.metrics.requestCount({ period: cdk.Duration.minutes(1) })],
                        width: 12,
                    }),
                    new cloudwatch.GraphWidget({
                        title: 'ALB 5xx Error Rate',
                        left: [
                            props.alb.metrics.httpCodeElb(elbv2.HttpCodeElb.ELB_5XX_COUNT, {
                                period: cdk.Duration.minutes(1),
                                statistic: 'Sum',
                            }),
                        ],
                        width: 12,
                    }),
                ],
                [
                    new cloudwatch.GraphWidget({
                        title: 'ECS CPU Utilisation',
                        left: [props.ecsService.metricCpuUtilization({ period: cdk.Duration.minutes(1) })],
                        width: 12,
                    }),
                    new cloudwatch.GraphWidget({
                        title: 'ECS Memory Utilisation',
                        left: [props.ecsService.metricMemoryUtilization({ period: cdk.Duration.minutes(1) })],
                        width: 12,
                    }),
                ],
                [
                    new cloudwatch.GraphWidget({
                        title: 'ALB Target Response Time (p50 / p95)',
                        left: [
                            props.albTargetGroup.metrics.targetResponseTime({
                                period: cdk.Duration.minutes(1),
                                statistic: 'p50',
                                label: 'p50 latency',
                            }),
                            props.albTargetGroup.metrics.targetResponseTime({
                                period: cdk.Duration.minutes(1),
                                statistic: 'p95',
                                label: 'p95 latency',
                            }),
                        ],
                        width: 24,
                    }),
                ],
                [
                    new cloudwatch.AlarmStatusWidget({
                        title: 'Alarm Status',
                        alarms: [alb5xxAlarm, ecsCpuAlarm],
                        width: 24,
                    }),
                ],
            ],
        });

        // ── Tags on the stack ──────────────────────────────────────────
        cdk.Tags.of(this).add('Project', '1');
        cdk.Tags.of(this).add('Environment', 'prod');
        cdk.Tags.of(this).add('Owner', 'farouk');
    }
}

export class BillingAlarmStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const billingTopic = new sns.Topic(this, 'BillingAlertTopic', {
            topicName: 'portfolio-1-billing-alerts',
            displayName: 'Portfolio Project 1 Billing Alerts',
        });

        billingTopic.addSubscription(
            new sns_subscriptions.EmailSubscription('your-email@example.com') // ← same email as before
        );

        new cloudwatch.Alarm(this, 'BillingAlarm', {
            alarmName: 'portfolio-1-estimated-charges',
            alarmDescription: 'Estimated AWS charges > $15',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Billing',
                metricName: 'EstimatedCharges',
                dimensionsMap: { Currency: 'USD' },
                period: cdk.Duration.hours(6),
                statistic: 'Maximum',
            }),
            threshold: 15,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

        cdk.Tags.of(this).add('Project', '1');
        cdk.Tags.of(this).add('Environment', 'prod');
        cdk.Tags.of(this).add('Owner', 'farouk');
    }
}