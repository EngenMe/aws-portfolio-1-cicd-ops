// infra/lib/waf-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

interface WafStackProps extends cdk.StackProps {
    albArn: string;
}

export class WafStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: WafStackProps) {
        super(scope, id, props);

        const webAcl = new wafv2.CfnWebACL(this, 'PortfolioWebAcl', {
            name: 'portfolio-1-web-acl',
            scope: 'REGIONAL',
            defaultAction: { allow: {} },
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: 'portfolio1WebAcl',
                sampledRequestsEnabled: true,
            },
            rules: [
                {
                    name: 'RateLimit100Per5Min',
                    priority: 1,
                    action: { block: {} },
                    visibilityConfig: {
                        cloudWatchMetricsEnabled: true,
                        metricName: 'RateLimit100Per5Min',
                        sampledRequestsEnabled: true,
                    },
                    statement: {
                        rateBasedStatement: {
                            limit: 100,
                            aggregateKeyType: 'IP',
                        },
                    },
                },
            ],
            tags: [
                { key: 'Project', value: '1' },
                { key: 'Environment', value: 'prod' },
                { key: 'Owner', value: 'farouk' },
            ],
        });

        new wafv2.CfnWebACLAssociation(this, 'WebAclAlbAssociation', {
            resourceArn: props.albArn,
            webAclArn: webAcl.attrArn,
        });

        new cdk.CfnOutput(this, 'WebAclArn', {
            value: webAcl.attrArn,
            description: 'WAF WebACL ARN',
        });
    }
}