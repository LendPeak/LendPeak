
aws s3 mb s3://lendpeak-backend-service
aws elasticbeanstalk create-application --application-name lendpeak-backend-service
aws elasticbeanstalk list-available-solution-stacks
aws elasticbeanstalk create-environment --application-name lendpeak-backend-service --environment-name prod --solution-stack-name "64bit Amazon Linux 2023 v6.4.0 running Node.js 22" --version-label v1

