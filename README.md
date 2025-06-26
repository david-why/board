# The Board: Anonymous Message Board

The Board is a simple anonymous message board designed with a focus on super basic functionality, super simple web design, and ease to deploy your own copy.

## Features

- Anonymous message board (no publicly identifiable information shown)
- Login required to prevent spam
- Multiple verification code-sending flows implemented
- Timezone selection to display dates in your local timezone

## Usage

To see The Board in action, visit [this public instance](https://theboard.davidwhy.me/)! (Note: if it gets abused, I might have to take it down.)

### For the power users...

If you'd like to deploy your own copy of The Board, it's super easy! Everything is deployed on Cloudflare Workers, and all the features used are free (to a certain extent). Just follow the simple steps below:

1. Register for an [Cloudflare account](https://dash.cloudflare.com/) if you don't have one already (you should!).
2. Delete the [GitHub Actions workflow](./.github/workflows/deploy_public.yml). You won't be needing that.
3. On your Cloudflare account, create:
   1. A D1 database (under "Storage &amp; Databases" in the sidebar)
   2. A KV namespace (also under "Storage &amp; Databases")
4. Fork this repo.
5. Update the `wrangler.jsonc` (NOT `wrangler-public.jsonc`) file, changing the following keys:
   1. `d1_databases.0.database_name` to the name of your D1 database
   2. `d1_databases.0.database_id` to the UUID of your D1 database
   3. `kv_namespaces.0.id` to the ID of your KV instance
6. On your Cloudflare account, create a Worker under "Compute (Workers)".
   1. Choose the "Import a repository" option when prompted.
   2. Connect your GitHub if asked, then choose your forked GitHub repository.
   3. Choose a project name.
   4. Under "Advanced settings", open the "Build variables" menu.
   5. Don't click "Create and deploy" until I tell you to!
7. Now, you need to set environment variables for your website. The following variable is mandatory:
   - `AUTH_SECRET`: Set this to some random bytes (such as the output of `openssl rand -hex 16`). Save this value locally!
8. Now, you need to choose a method of sending verification codes. You can choose from the following:
   - Outlook: Verification codes are sent from an Outlook account (this is the one used on the public instance). To set up:
     1. Create an application registration on [Microsoft Entra ID in the Azure portal](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps).
     2. Set the redirect URI to `https://your.domain.for.the.board/api/admin/outlook-auth-callback`.
     3. Create a client secret.
     4. Set the following environment variables on Cloudflare:
        - `VERIFY_OUTLOOK_CLIENT_ID`: Your Application ID.
        - `VERIFY_OUTLOOK_CLIENT_SECRET`: Your client secret.
   - URL: Codes will be sent by sending a POST request to a given URL, with the following JSON body: `{"email": "email_to_send_to@example.com", "code": "123456"}`. To set up:
     1. First, setup a server that will answer these POST requests and actually send the emails. Make sure the URL is long and hard to guess!
     2. Set the following enviroment variable on Cloudflare:
        - `VERIFY_CODE_URL`: The URL to send code requests to.
9. IMPORTANT: You must click the "Encrypt" button for each environment variable you set! This makes them Secrets which won't be overridden by a deployment.
10. Now, click the "Create and deploy" button and wait for it to finish.
11. If you chose the Outlook verification code method, you must now link your Outlook account:
    1. Go to `https://your.domain/api/admin/outlook-auth?auth=YOUR_AUTH_SECRET`
    2. Follow the instructions to link your account.
12. Profit!
