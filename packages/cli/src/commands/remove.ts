import { URL } from 'url';
import { Args, Command, Flags, ux } from '@oclif/core';
import { identifyDeployKey as identifyAccessToken } from '../command-helpers/auth';
import { createJsonRpcClient } from '../command-helpers/jsonrpc';
import { validateNodeUrl } from '../command-helpers/node';

export default class RemoveCommand extends Command {
  static description = 'Unregisters a subgraph name';

  static args = {
    'subgraph-name': Args.string({
      required: true,
    }),
  };

  static flags = {
    node: Flags.string({
      summary: 'Graph node to delete the subgraph from.',
      char: 'g',
      required: true,
    }),
    'access-token': Flags.string({
      summary: 'Graph access token.',
    }),
  };

  async run() {
    const {
      args: { 'subgraph-name': subgraphName },
      flags: { 'access-token': accessTokenFlag, node },
    } = await this.parse(RemoveCommand);

    try {
      validateNodeUrl(node);
    } catch (e) {
      this.error(`Graph node "${node}" is invalid: ${e.message}`, { exit: 1 });
    }

    const requestUrl = new URL(node);
    const client = createJsonRpcClient(requestUrl);

    // Exit with an error code if the client couldn't be created
    if (!client) {
      this.exit(1);
      return;
    }

    // Use the access token, if one is set
    const accessToken = await identifyAccessToken(node, accessTokenFlag);
    if (accessToken !== undefined && accessToken !== null) {
      // @ts-expect-error options property seems to exist
      client.options.headers = { Authorization: `Bearer ${accessToken}` };
    }

    ux.action.start(`Removing subgraph in Graph node: ${requestUrl}`);
    client.request(
      'subgraph_remove',
      { name: subgraphName },
      (
        // @ts-expect-error TODO: why are the arguments not typed?
        requestError,
        // @ts-expect-error TODO: why are the arguments not typed?
        jsonRpcError,
        // TODO: this argument is unused, but removing it from the commands/create.ts fails the basic-event-handlers tests.
        //       I'll therefore leave it in here too until we figure out the weirdness
        // @ts-expect-error TODO: why are the arguments not typed?
        _res,
      ) => {
        if (jsonRpcError) {
          ux.action.stop(`✖ Error removed the subgraph: ${jsonRpcError.message}`);
          this.exit(1);
        } else if (requestError) {
          ux.action.stop(`✖ HTTP error removed the subgraph: ${requestError.code}`);
          this.exit(1);
        } else {
          ux.action.stop('Subgraph removed');
          this.exit(1);
        }
      },
    );
  }
}