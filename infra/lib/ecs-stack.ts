import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

interface EcsStackProps extends cdk.StackProps {
    repository: ecr.Repository;
}

export class EcsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: EcsStackProps) {
        super(scope, id, props);

        // --- VPC ---
        const vpc = new ec2.Vpc(this, 'AppVpc', {
            maxAzs: 2,
            natGateways: 0,
            subnetConfiguration: [
                {
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
                {
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidrMask: 24,
                },
            ],
        });

        // --- ECS Cluster ---
        const cluster = new ecs.Cluster(this, 'AppCluster', {
            vpc,
            clusterName: 'portfolio-1-cluster',
            containerInsightsV2: ecs.ContainerInsights.ENABLED,
        });

        // --- CloudWatch Log Group ---
        const logGroup = new logs.LogGroup(this, 'AppLogGroup', {
            logGroupName: '/ecs/portfolio-1-app',
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // --- Task Execution Role ---
        const executionRole = new iam.Role(this, 'TaskExecutionRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    'service-role/AmazonECSTaskExecutionRolePolicy'
                ),
            ],
        });

        // Grant ECR pull permission
        props.repository.grantPull(executionRole);

        // --- Task Definition ---
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'AppTaskDef', {
            memoryLimitMiB: 512,
            cpu: 256,                    // 0.25 vCPU
            executionRole,
            runtimePlatform: {
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                cpuArchitecture: ecs.CpuArchitecture.X86_64,
            },
        });

        taskDefinition.addContainer('AppContainer', {
            image: ecs.ContainerImage.fromEcrRepository(props.repository, 'latest'),
            containerName: 'portfolio-1-app',
            portMappings: [{ containerPort: 3000 }],
            environment: {
                AWS_REGION: this.region,
                NODE_ENV: 'production',
            },
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'portfolio-1-app',
                logGroup,
            }),
        });

        // --- Security Groups ---
        const albSg = new ec2.SecurityGroup(this, 'AlbSg', {
            vpc,
            description: 'Allow HTTP and HTTPS from internet',
            allowAllOutbound: true,
        });
        albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP from internet');
        albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS from internet');

        const taskSg = new ec2.SecurityGroup(this, 'TaskSg', {
            vpc,
            description: 'Allow traffic only from ALB',
            allowAllOutbound: true,
        });
        taskSg.addIngressRule(albSg, ec2.Port.tcp(3000), 'From ALB on port 3000');

        // --- ECS Service ---
        const service = new ecs.FargateService(this, 'AppService', {
            cluster,
            taskDefinition,
            desiredCount: 1,
            serviceName: 'portfolio-1-service',
            assignPublicIp: true,
            securityGroups: [taskSg],
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            healthCheckGracePeriod: cdk.Duration.seconds(60),
            minHealthyPercent: 100,
            maxHealthyPercent: 200,
            circuitBreaker: { enable: true, rollback: true },
        });

        // --- ALB ---
        const alb = new elbv2.ApplicationLoadBalancer(this, 'AppAlb', {
            vpc,
            internetFacing: true,
            securityGroup: albSg,
            loadBalancerName: 'portfolio-1-alb',
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
        });

        // --- Target Group ---
        const targetGroup = new elbv2.ApplicationTargetGroup(this, 'AppTargetGroup', {
            vpc,
            port: 3000,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                path: '/health',
                healthyHttpCodes: '200',
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3,
            },
        });

        // Register ECS service with target group
        service.attachToApplicationTargetGroup(targetGroup);

        // --- HTTP → HTTPS redirect ---
        alb.addListener('HttpListener', {
            port: 80,
            defaultAction: elbv2.ListenerAction.redirect({
                protocol: 'HTTPS',
                port: '443',
                permanent: true,
            }),
        });

        // --- HTTPS Listener ---
        const certificate = acm.Certificate.fromCertificateArn(
            this,
            'AppCertificate',
            'arn:aws:acm:eu-west-1:725927310615:certificate/6ffeb54e-c989-4430-b7ef-203ec9b735f8'
        );

        alb.addListener('HttpsListener', {
            port: 443,
            certificates: [certificate],
            defaultAction: elbv2.ListenerAction.forward([targetGroup]),
        });

        // --- Route 53 A Record ---
        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
            hostedZoneId: 'Z03831462JGL0H5K6RYHX',
            zoneName: 'faroukhasnaoui.tech',
        });

        new route53.ARecord(this, 'OpsARecord', {
            zone: hostedZone,
            recordName: 'ops',
            target: route53.RecordTarget.fromAlias(
                new route53targets.LoadBalancerTarget(alb)
            ),
            ttl: cdk.Duration.seconds(60),
        });

        // Tags
        cdk.Tags.of(this).add('Project', '1');
        cdk.Tags.of(this).add('Environment', 'prod');
        cdk.Tags.of(this).add('Owner', 'farouk');
    }
}