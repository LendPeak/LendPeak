declare module "aws-serverless-koa" {
  import { APIGatewayProxyHandler } from "aws-lambda";
  import Koa from "koa";

  /**
   * Wraps a Koa application to handle AWS API Gateway events via AWS Lambda.
   * @param app The Koa application instance.
   * @returns A handler function compatible with AWS Lambda.
   */
  function awsServerlessKoa(app: Koa): APIGatewayProxyHandler;

  export = awsServerlessKoa;
}
