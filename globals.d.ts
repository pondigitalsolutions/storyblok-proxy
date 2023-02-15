import { MockAgent } from 'undici';

declare global {
  function getMiniflareBindings(): Bindings;
  function getMiniflareDurableObjectState(
    id: DurableObjectId
  ): Promise<DurableObjectState>;
  function getMiniflareFetchMock(): MockAgent;
}

export {};
