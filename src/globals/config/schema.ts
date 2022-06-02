import joi from 'joi';
import { componentSchema } from '../../utilities/componentSchema';

const globalSchema = joi.object().keys({
  slug: joi.string().required(),
  label: joi.string(),
  admin: joi.object({
    hideAPIURL: joi.boolean(),
    description: joi.alternatives().try(
      joi.string(),
      componentSchema,
    ),
  }),
  hooks: joi.object({
    beforeValidate: joi.array().items(joi.func()),
    beforeChange: joi.array().items(joi.func()),
    afterChange: joi.array().items(joi.func()),
    beforeRead: joi.array().items(joi.func()),
    afterRead: joi.array().items(joi.func()),
  }),
  endpoints: joi.array().items(joi.object({
    path: joi.string(),
    method: joi.string().valid('get', 'head', 'post', 'put', 'patch', 'delete', 'connect', 'options'),
    handler: joi.alternatives().try(
      joi.array().items(joi.func()),
      joi.func(),
    ),
  })),
  access: joi.object({
    read: joi.func(),
    readVersions: joi.func(),
    update: joi.func(),
  }),
  fields: joi.array(),
  versions: joi.alternatives().try(
    joi.object({
      max: joi.number(),
      drafts: joi.alternatives().try(
        joi.object({
          autosave: joi.alternatives().try(
            joi.boolean(),
            joi.object({
              interval: joi.number(),
            }),
          ),
        }),
        joi.boolean(),
      ),
    }),
    joi.boolean(),
  ),
}).unknown();

export default globalSchema;
