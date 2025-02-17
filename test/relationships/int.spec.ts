import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import { initPayloadTest } from '../helpers/configHelpers';
import config, { customIdSlug, chainedRelSlug, defaultAccessRelSlug, slug, relationSlug, customIdNumberSlug } from './config';
import payload from '../../src';
import { RESTClient } from '../helpers/rest';
import type { ChainedRelation, CustomIdNumberRelation, CustomIdRelation, Post, Relation } from './payload-types';
import { mapAsync } from '../../src/utilities/mapAsync';

let client: RESTClient;

type EasierChained = { relation: EasierChained, id: string }

describe('Relationships', () => {
  beforeAll(async () => {
    const { serverURL } = await initPayloadTest({ __dirname, init: { local: false } });
    client = new RESTClient(config, { serverURL, defaultSlug: slug });
    await client.login();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await payload.mongoMemoryServer.stop();
  });

  beforeEach(async () => {
    await clearDocs();
  });

  describe('Querying', () => {
    describe('Relationships', () => {
      let post: Post;
      let relation: Relation;
      let filteredRelation: Relation;
      let defaultAccessRelation: Relation;
      let chained: ChainedRelation;
      let chained2: ChainedRelation;
      let chained3: ChainedRelation;
      let customIdRelation: CustomIdRelation;
      let customIdNumberRelation: CustomIdNumberRelation;
      let generatedCustomId: string;
      let generatedCustomIdNumber: number;
      const nameToQuery = 'name';

      beforeEach(async () => {
        relation = await payload.create<Relation>({
          collection: relationSlug,
          data: {
            name: nameToQuery,
          },
        });

        filteredRelation = await payload.create<Relation>({
          collection: relationSlug,
          data: {
            name: nameToQuery,
            disableRelation: false,
          },
        });

        defaultAccessRelation = await payload.create<Relation>({
          collection: defaultAccessRelSlug,
          data: {
            name: 'default access',
          },
        });

        chained3 = await payload.create<ChainedRelation>({
          collection: chainedRelSlug,
          data: {
            name: 'chain3',
          },
        });

        chained2 = await payload.create<ChainedRelation>({
          collection: chainedRelSlug,
          data: {
            name: 'chain2',
            relation: chained3.id,
          },
        });

        chained = await payload.create<ChainedRelation>({
          collection: chainedRelSlug,
          data: {
            name: 'chain1',
            relation: chained2.id,
          },
        });

        generatedCustomId = `custom-${randomBytes(32).toString('hex').slice(0, 12)}`;
        customIdRelation = await payload.create<CustomIdRelation>({
          collection: customIdSlug,
          data: {
            id: generatedCustomId,
            name: 'custom-id',
          },
        });

        generatedCustomIdNumber = Math.floor(Math.random() * (1000)) + 1;
        customIdNumberRelation = await payload.create<CustomIdNumberRelation>({
          collection: customIdNumberSlug,
          data: {
            id: generatedCustomIdNumber,
            name: 'custom-id-number',
          },
        });

        post = await createPost({
          relationField: relation.id,
          defaultAccessRelation: defaultAccessRelation.id,
          chainedRelation: chained.id,
          maxDepthRelation: relation.id,
          customIdRelation: customIdRelation.id,
          customIdNumberRelation: customIdNumberRelation.id,
          filteredRelation: filteredRelation.id,
        });

        await createPost(); // Extra post to allow asserting totalDoc count
      });

      it('should prevent an unauthorized population of strict access', async () => {
        const { doc } = await client.findByID<Post>({ id: post.id, auth: false });
        expect(doc.defaultAccessRelation).toEqual(defaultAccessRelation.id);
      });

      it('should populate strict access when authorized', async () => {
        const { doc } = await client.findByID<Post>({ id: post.id });
        expect(doc.defaultAccessRelation).toEqual(defaultAccessRelation);
      });

      it('should use filterOptions to limit relationship options', async () => {
        const { doc } = await client.findByID<Post>({ id: post.id });

        expect(doc.filteredRelation).toMatchObject({ id: filteredRelation.id });

        await client.update<Relation>({ id: filteredRelation.id, slug: relationSlug, data: { disableRelation: true } });

        const { doc: docAfterUpdatingRel } = await client.findByID<Post>({ id: post.id });

        // No change to existing relation
        expect(docAfterUpdatingRel.filteredRelation).toMatchObject({ id: filteredRelation.id });

        // Attempt to update post with a now filtered relation
        const { status, errors } = await client.update<Post>({ id: post.id, data: { filteredRelation: filteredRelation.id } });

        expect(errors?.[0]).toMatchObject({ name: 'ValidationError', message: expect.any(String), data: expect.anything() });
        expect(status).toEqual(400);
      });

      describe('depth', () => {
        it('should populate to depth', async () => {
          const { doc } = await client.findByID<Post>({ id: post.id, options: { depth: 2 } });
          const depth0 = doc?.chainedRelation as EasierChained;
          expect(depth0.id).toEqual(chained.id);
          expect(depth0.relation.id).toEqual(chained2.id);
          expect(depth0.relation.relation as unknown as string).toEqual(chained3.id);
          expect(depth0.relation.relation).toEqual(chained3.id);
        });

        it('should only populate ID if depth 0', async () => {
          const { doc } = await client.findByID<Post>({ id: post.id, options: { depth: 0 } });
          expect(doc?.chainedRelation).toEqual(chained.id);
        });

        it('should respect maxDepth at field level', async () => {
          const { doc } = await client.findByID<Post>({ id: post.id, options: { depth: 1 } });
          expect(doc?.maxDepthRelation).toEqual(relation.id);
          expect(doc?.maxDepthRelation).not.toHaveProperty('name');
          // should not affect other fields
          expect(doc?.relationField).toMatchObject({ id: relation.id, name: relation.name });
        });

        it('should query a custom id relation', async () => {
          const { doc } = await client.findByID<Post>({ id: post.id });
          expect(doc?.customIdRelation).toMatchObject({ id: generatedCustomId });
        });

        it('should query a custom id number relation', async () => {
          const { doc } = await client.findByID<Post>({ id: post.id });
          expect(doc?.customIdNumberRelation).toMatchObject({ id: generatedCustomIdNumber });
        });
      });
    });
  });
});

async function createPost(overrides?: Partial<Post>) {
  return payload.create<Post>({ collection: slug, data: { title: 'title', ...overrides } });
}

async function clearDocs(): Promise<void> {
  const allDocs = await payload.find<Post>({ collection: slug, limit: 100 });
  const ids = allDocs.docs.map((doc) => doc.id);
  await mapAsync(ids, async (id) => {
    await payload.delete({ collection: slug, id });
  });
}
