import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class EcrStack extends cdk.Stack {
    public readonly repository: ecr.Repository;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.repository = new ecr.Repository(this, 'AppRepository', {
            repositoryName: 'portfolio-1-app',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            lifecycleRules: [
                {
                    description: 'Keep only the last 5 images',
                    maxImageCount: 5,
                    rulePriority: 1,
                    tagStatus: ecr.TagStatus.ANY,
                },
            ],
        });

        // Tagging
        cdk.Tags.of(this).add('Project', '1');
        cdk.Tags.of(this).add('Environment', 'prod');
        cdk.Tags.of(this).add('Owner', 'farouk');
    }
}