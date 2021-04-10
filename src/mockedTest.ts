import { ModuleMetadata } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { MockedModule, MockedModuleBuilder } from "./mockedModule";

export interface MockedModuleMetadata extends Pick<ModuleMetadata, "providers"> {}

export type MockedModuleBuilderFactory<MMB extends MockedModuleBuilder<any>> = (
  metadata: ModuleMetadata,
  metadataToMock: MockedModuleMetadata
) => MMB;

export abstract class MockedTest extends Test {
  static createMockedModule: MockedModuleBuilderFactory<MockedModuleBuilder<any>>;
}
