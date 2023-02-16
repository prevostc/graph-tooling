import { Args, Command, Flags, ux } from '@oclif/core';
import { saveDeployKey } from '../command-helpers/auth';
import { chooseNodeUrl } from '../command-helpers/node';

export default class AuthCommand extends Command {
  static description = 'Sets the deploy key to use when deploying to a Graph node.';

  static args = {
    node: Args.string(),
    'deploy-key': Args.string(),
  };

  static flags = {
    product: Flags.string({
      summary: 'Select a product for which to authenticate.',
      options: ['subgraph-studio', 'hosted-service'],
    }),
    studio: Flags.boolean({
      summary: 'Shortcut for "--product subgraph-studio".',
      exclusive: ['product'],
    }),
  };

  async run() {
    const {
      args: { node: nodeOrDeployKey, 'deploy-key': deployKeyFlag },
      flags: { product, studio },
    } = await this.parse(AuthCommand);

    // if user specifies --product or --studio then deployKey is the first parameter
    let node: string | undefined;
    let deployKey = deployKeyFlag;
    if (product || studio) {
      ({ node } = chooseNodeUrl({ product, studio, node }));
      deployKey = nodeOrDeployKey;
    } else {
      node = nodeOrDeployKey;
    }

    // eslint-disable-next-line -- prettier has problems with ||=
    node =
      node ||
      (await ux.prompt('Which product to initialize?', {
        required: true,
      }));

    // eslint-disable-next-line -- prettier has problems with ||=
    deployKey =
      deployKey ||
      (await ux.prompt('What is the deploy key?', {
        required: true,
        type: 'mask',
      }));
    if (deployKey.length > 200) {
      this.error('✖ Deploy key must not exceed 200 characters', { exit: 1 });
    }

    ux.action.start(`Setting deploy key for "${node}"`);
    try {
      await saveDeployKey(node!, deployKey);
      ux.action.stop(`✔ Deploy key set for "${node}"`);
    } catch (e) {
      this.error(e, { exit: 1 });
    }
  }
}