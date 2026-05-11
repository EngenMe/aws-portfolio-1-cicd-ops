#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EcrStack } from '../lib/ecr-stack';
import { EcsStack } from '../lib/ecs-stack';
import { PipelineStack } from '../lib/pipeline-stack';
import { MonitoringStack, BillingAlarmStack } from '../lib/monitoring-stack';

const app = new cdk.App();

const ecrStack = new EcrStack(app, 'EcrStack', {
    env: {
        account: '725927310615',
        region: 'eu-west-1',
    },
});

const ecsStack = new EcsStack(app, 'EcsStack', {
    env: {
        account: '725927310615',
        region: 'eu-west-1',
    },
    repository: ecrStack.repository,
});

const monitoringStack = new MonitoringStack(app, 'MonitoringStack', {
    env: {
        account: '725927310615',
        region: 'eu-west-1',
    },
    alb: ecsStack.alb,
    ecsService: ecsStack.service,
    albTargetGroup: ecsStack.blueTargetGroup,
});

new PipelineStack(app, 'PipelineStack', {
    env: {
        account: '725927310615',
        region: 'eu-west-1',
    },
    ecrRepo: ecrStack.repository,
    ecsService: ecsStack.service,
    blueTargetGroup: ecsStack.blueTargetGroup,
    greenTargetGroup: ecsStack.greenTargetGroup,
    listener: ecsStack.httpsListener,
    rollbackAlarm: monitoringStack.rollbackAlarm,
});

new BillingAlarmStack(app, 'BillingAlarmStack', {
    env: {
        account: '725927310615',
        region: 'us-east-1',
    },
});