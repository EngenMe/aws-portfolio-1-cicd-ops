#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EcrStack } from '../lib/ecr-stack';

const app = new cdk.App();

new EcrStack(app, 'EcrStack', {
    env: {
        account: '725927310615',
        region: 'eu-west-1',
    },
});