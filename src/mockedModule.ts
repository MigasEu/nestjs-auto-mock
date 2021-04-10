import { Abstract, ModuleMetadata, Type } from "@nestjs/common";
import { Test, TestingModule, TestingModuleBuilder } from "@nestjs/testing";
import { MockedModuleMetadata, MockedTest } from "./mockedTest";

export abstract class MockedModule<M extends any, S extends any> extends TestingModule {
    abstract getMock<TInput = any>(typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol): M;
    abstract getSpy<TInput = any>(typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol): S;
}

export abstract class MockedModuleBuilder<
    MM extends MockedModule<any, any>
    > extends TestingModuleBuilder {
    abstract compileMocked(): Promise<MM>;
}
