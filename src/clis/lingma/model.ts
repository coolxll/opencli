import { cli, Strategy } from '../../registry.js';
import { SelectorError } from '../../errors.js';
import type { IPage } from '../../types.js';
import { lingmaRequiredEnv } from './shared.js';
import { getLingmaCurrentModel, switchLingmaModel } from './helpers.js';

export const modelCommand = cli({
  site: 'lingma',
  name: 'model',
  description: 'Get or switch the active model in the Lingma Editor chat footer',
  domain: 'localhost',
  strategy: Strategy.UI,
  browser: true,
  requiredEnv: lingmaRequiredEnv,
  args: [
    { name: 'model-name', required: false, positional: true, help: 'Model to switch to, for example Auto, qwen3-coder, qwen3-max' },
  ],
  columns: ['Status', 'Model'],
  func: async (page: IPage, kwargs: any) => {
    const desiredModel = kwargs['model-name'] as string | undefined;
    const currentModel = await getLingmaCurrentModel(page);

    if (!desiredModel) {
      return [{ Status: 'Active', Model: currentModel }];
    }

    const switched = await switchLingmaModel(page, desiredModel);
    if (!switched) {
      throw new SelectorError('Lingma model selector');
    }

    return [
      {
        Status: 'Switched',
        Model: desiredModel,
      },
    ];
  },
});
