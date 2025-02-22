import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as path from "path";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as logs from "aws-cdk-lib/aws-logs";
import { CorsHttpMethod, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lookup the Hosted Zone in Route 53
    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: "lendpeak.io",
    });

    // Create an ACM certificate
    const certificate = new certificatemanager.Certificate(this, "Certificate", {
      domainName: "backend-service.lendpeak.io",
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. Create or Import Your XAI Secrets from AWS Secrets Manager
    //    For demonstration, we create a new Secret named 'lendpeak-xai-keys'
    //    containing a JSON structure with "systemKey" by default. You could add
    //    additional keys for special users, e.g., "specialUserKey", etc.
    // ─────────────────────────────────────────────────────────────────────────────
    const xaiKeysSecret = new secretsmanager.Secret(this, "XAIKeysSecret", {
      secretName: "lendpeak-xai-keys",
      // Optionally seed with a placeholder JSON so you can easily add more keys later
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ systemKey: "PLACEHOLDER_SYSTEM_KEY" }),
        generateStringKey: "randomUnusedKey", // not actually used in this example
        excludePunctuation: true,
      },
    });

    const openAIGptSecret = new secretsmanager.Secret(this, "OpenAIGptSecret", {
      secretName: "lendpeak-openai-keys",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ systemKey: "PLACEHOLDER_OPENAI_KEY" }),
        generateStringKey: "unusedKey",
        excludePunctuation: true,
      },
    });

    // Define the Lambda function
    const backendLambda = new lambda.Function(this, "BackendLambda", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "lambda.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../dist")),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: "production",
        // 2. Provide the secret name as an environment variable
        XAI_KEYS_SECRET_NAME: xaiKeysSecret.secretName,
      },
    });

    // 3. Grant Lambda permission to read the secret
    xaiKeysSecret.grantRead(backendLambda);
    openAIGptSecret.grantRead(backendLambda);

    // Create a log group for API Gateway access logs
    const logGroup = new logs.LogGroup(this, "HttpApiAccessLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create an HTTP API
    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      createDefaultStage: false,
      corsPreflight: {
        allowHeaders: ["Content-Type", "Authorization", "lendpeak-authorization", "lendpeak-autopal-instance-id", "lendpeak-forward-headers", "lendpeak-target-domain"],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.PUT, CorsHttpMethod.DELETE, CorsHttpMethod.OPTIONS],
        allowOrigins: ["https://demo.engine.lendpeak.io"],
        allowCredentials: true,
      },
    });

    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE, HttpMethod.PATCH],
      integration: new integrations.HttpLambdaIntegration("LambdaIntegration", backendLambda, {
        payloadFormatVersion: apigatewayv2.PayloadFormatVersion.VERSION_1_0,
      }),
    });

    // Create a custom $default stage
    const stage = new apigatewayv2.HttpStage(this, "ProdStage", {
      httpApi,
      stageName: "prod",
      autoDeploy: true,
    });

    const cfnStage = stage.node.defaultChild as apigatewayv2.CfnStage;
    cfnStage.accessLogSettings = {
      destinationArn: logGroup.logGroupArn,
      format: JSON.stringify({
        requestId: "$context.requestId",
        sourceIp: "$context.identity.sourceIp",
        requestTime: "$context.requestTime",
        httpMethod: "$context.httpMethod",
        routeKey: "$context.routeKey",
        status: "$context.status",
        protocol: "$context.protocol",
        responseLength: "$context.responseLength",
        integrationStatus: "$context.integrationStatus",
        integrationErrorMessage: "$context.integrationErrorMessage",
        integrationLatency: "$context.integrationLatency",
      }),
    };

    // Define the custom domain for the API Gateway
    const domainName = new apigatewayv2.DomainName(this, "DomainName", {
      domainName: "backend-service.lendpeak.io",
      certificate: certificate,
    });

    // Map the custom domain to the newly created custom stage
    new apigatewayv2.ApiMapping(this, "ApiMapping", {
      api: httpApi,
      domainName: domainName,
      stage: stage,
    });

    // Create a Route 53 alias record
    new route53.ARecord(this, "AliasRecord", {
      zone: hostedZone,
      recordName: "backend-service",
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayv2DomainProperties(domainName.regionalDomainName, domainName.regionalHostedZoneId)),
    });

    // Output API endpoint
    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.apiEndpoint,
    });

    // Output the custom domain URL
    new cdk.CfnOutput(this, "CustomApiUrl", {
      value: `https://${domainName.name}`,
      description: "The custom domain URL of the API Gateway",
    });
  }
}
