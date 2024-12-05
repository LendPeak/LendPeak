import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";
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

    // Define the Lambda function
    const backendLambda = new lambda.Function(this, "BackendLambda", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "lambda.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../dist")),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: "production",
      },
    });

    // Create a log group for API Gateway access logs
    const logGroup = new logs.LogGroup(this, "HttpApiAccessLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create an HTTP API without an automatic default stage
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

    // Access the underlying CfnStage to set accessLogSettings
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
