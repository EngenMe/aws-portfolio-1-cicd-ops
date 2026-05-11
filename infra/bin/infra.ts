#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EcrStack } from '../lib/ecr-stack';
import { EcsStack } from '../lib/ecs-stack';

const app = new cdk.App();

const ecrStack = new EcrStack(app, 'EcrStack', {
    env: {
        account: '725927310615',
        region: 'eu-west-1',
    },
});

new EcsStack(app, 'EcsStack', {
    env: {
        account: '725927310615',
        region: 'eu-west-1',
    },
    repository: ecrStack.repository,
});