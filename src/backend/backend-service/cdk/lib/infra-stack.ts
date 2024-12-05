import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import { CorsHttpMethod } from "aws-cdk-lib/aws-apigatewayv2";

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

    // Define Lambda function
    const backendLambda = new lambda.Function(this, "BackendLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "lambda.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../dist")),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: "production",
      },
    });

    // Define API Gateway with CORS configuration
    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      defaultIntegration: new integrations.HttpLambdaIntegration("LambdaIntegration", backendLambda),
      corsPreflight: {
        allowHeaders: ["Content-Type", "Authorization", "x-target-domain", "Autopal-Instance-Id", "x-forward-headers"],
        allowMethods: [apigatewayv2.CorsHttpMethod.GET, apigatewayv2.CorsHttpMethod.POST, apigatewayv2.CorsHttpMethod.PUT, apigatewayv2.CorsHttpMethod.DELETE, apigatewayv2.CorsHttpMethod.OPTIONS],
        allowOrigins: ["https://demo.engine.lendpeak.io"],
        allowCredentials: true,
      },
    });

    // Define the custom domain for the API Gateway
    const domainName = new apigatewayv2.DomainName(this, "DomainName", {
      domainName: "backend-service.lendpeak.io",
      certificate: certificate,
    });

    // Map the custom domain to the API stage
    new apigatewayv2.ApiMapping(this, "ApiMapping", {
      api: httpApi,
      domainName: domainName,
      stage: httpApi.defaultStage!,
    });

    // Create a Route 53 alias record
    new route53.ARecord(this, "AliasRecord", {
      zone: hostedZone,
      recordName: "backend-service",
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayv2DomainProperties(domainName.regionalDomainName, domainName.regionalHostedZoneId)),
    });

    // Output API URL
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
