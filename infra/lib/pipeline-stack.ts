import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

interface PipelineStackProps extends cdk.StackProps {
    ecrRepo: ecr.Repository;
    ecsService: ecs.FargateService;
    blueTargetGroup: elbv2.ApplicationTargetGroup;
    greenTargetGroup: elbv2.ApplicationTargetGroup;
    listener: elbv2.ApplicationListener;
    rollbackAlarm: cloudwatch.IAlarm;
}

export class PipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: PipelineStackProps) {
        super(scope, id, props);

        // ── 1. S3 Artifacts Bucket ──────────────────────────────────────────────
        const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            lifecycleRules: [
                {
                    expiration: cdk.Duration.days(30),
                },
            ],
        });
        cdk.Tags.of(artifactsBucket).add('Project', '1');
        cdk.Tags.of(artifactsBucket).add('Environment', 'prod');
        cdk.Tags.of(artifactsBucket).add('Owner', 'farouk');

        // ── 2. CodeBuild Project ────────────────────────────────────────────────
        const codeBuildRole = new iam.Role(this, 'CodeBuildRole', {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
        });

        codeBuildRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
                'ecr:InitiateLayerUpload',
                'ecr:UploadLayerPart',
                'ecr:CompleteLayerUpload',
                'ecr:PutImage',
            ],
            resources: ['*'],
        }));

        codeBuildRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:GetBucketAcl',
                's3:GetBucketLocation',
            ],
            resources: [
                artifactsBucket.bucketArn,
                `${artifactsBucket.bucketArn}/*`,
            ],
        }));

        codeBuildRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: ['*'],
        }));

        const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
            role: codeBuildRole,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                computeType: codebuild.ComputeType.SMALL,
                privileged: true, // required for docker build
            },
            environmentVariables: {
                AWS_ACCOUNT_ID: {
                    value: this.account,
                },
            },
            buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
        });
        cdk.Tags.of(buildProject).add('Project', '1');
        cdk.Tags.of(buildProject).add('Environment', 'prod');
        cdk.Tags.of(buildProject).add('Owner', 'farouk');

        // ── 3. CodeDeploy Blue/Green ────────────────────────────────────────────
        const codeDeployApp = new codedeploy.EcsApplication(this, 'CodeDeployApp', {
            applicationName: 'portfolio-1-app',
        });
        cdk.Tags.of(codeDeployApp).add('Project', '1');
        cdk.Tags.of(codeDeployApp).add('Environment', 'prod');
        cdk.Tags.of(codeDeployApp).add('Owner', 'farouk');

        const deploymentGroup = new codedeploy.EcsDeploymentGroup(this, 'DeploymentGroup', {
            application: codeDeployApp,
            deploymentGroupName: 'portfolio-1-dg',
            service: props.ecsService,
            blueGreenDeploymentConfig: {
                blueTargetGroup: props.blueTargetGroup,
                greenTargetGroup: props.greenTargetGroup,
                listener: props.listener,
                terminationWaitTime: cdk.Duration.minutes(5),
            },
            deploymentConfig: codedeploy.EcsDeploymentConfig.CANARY_10PERCENT_5MINUTES,
            autoRollback: {
                failedDeployment: true,
                stoppedDeployment: true,
                deploymentInAlarm: true,
            },
            alarms: [props.rollbackAlarm],
        });
        cdk.Tags.of(deploymentGroup).add('Project', '1');
        cdk.Tags.of(deploymentGroup).add('Environment', 'prod');
        cdk.Tags.of(deploymentGroup).add('Owner', 'farouk');

        // ── 4. CodePipeline ─────────────────────────────────────────────────────
        const sourceOutput = new codepipeline.Artifact('SourceOutput');
        const buildOutput = new codepipeline.Artifact('BuildOutput');

        const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: 'portfolio-1-pipeline',
            artifactBucket: artifactsBucket,
            stages: [
                {
                    stageName: 'Source',
                    actions: [
                        new codepipeline_actions.CodeStarConnectionsSourceAction({
                            actionName: 'GitHub_Source',
                            owner: 'EngenMe',
                            repo: 'aws-portfolio-1-cicd-ops',
                            branch: 'main',
                            connectionArn: 'arn:aws:codestar-connections:eu-west-1:725927310615:connection/ddf76c6a-441b-4f86-870d-cc2c7883129b',
                            output: sourceOutput,
                            triggerOnPush: true,
                        }),
                    ],
                },
                {
                    stageName: 'Build',
                    actions: [
                        new codepipeline_actions.CodeBuildAction({
                            actionName: 'Build_and_Push',
                            project: buildProject,
                            input: sourceOutput,
                            outputs: [buildOutput],
                        }),
                    ],
                },
                {
                    stageName: 'Deploy',
                    actions: [
                        new codepipeline_actions.CodeDeployEcsDeployAction({
                            actionName: 'Blue_Green_Deploy',
                            deploymentGroup,
                            taskDefinitionTemplateInput: sourceOutput,
                            appSpecTemplateInput: sourceOutput,
                            containerImageInputs: [
                                {
                                    input: buildOutput,
                                    taskDefinitionPlaceholder: 'IMAGE1_NAME',
                                },
                            ],
                        }),
                    ],
                },
            ],
        });
        cdk.Tags.of(pipeline).add('Project', '1');
        cdk.Tags.of(pipeline).add('Environment', 'prod');
        cdk.Tags.of(pipeline).add('Owner', 'farouk');
    }
}