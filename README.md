# ado-oauth-test

Wanted to prove an application where an Azure DevOps user can authorize the application to call specific Azure DevOps APIs on their
behalf. Although implemented in Node, the OAuth flows are based on a C#/.Net example from Microsoft:
[ASP.NET web app (Azure DevOps OAuth sample)](https://github.com/microsoft/azure-devops-auth-samples/tree/master/OAuthWebSample). The 
Node/Express/Pug code started out based on this article: 
[Create a Node.js web app in Azure](https://docs.microsoft.com/en-us/azure/app-service/quickstart-nodejs?pivots=platform-linux).

The application:
* is deployed to Azure App Service
* is registered as an OAuth application with Azure DevOps [here](https://app.vsaex.visualstudio.com/app/register)
* looks for environment variables on the Azure App Service config
* looks for secrets in a configured Azure Key Vault
