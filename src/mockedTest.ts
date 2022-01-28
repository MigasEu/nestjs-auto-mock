import {
  ClassProvider,
  DynamicModule,
  FactoryProvider,
  ForwardReference,
  ModuleMetadata,
  Provider,
  Type,
  ValueProvider,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { MockedModuleBuilder } from './mockedModule';

export type MockedModuleMetadata = Omit<Omit<ModuleMetadata, 'controllers'>, 'exports'>;

export type MockedModuleBuilderFactory<M, S, MMB = MockedModuleBuilder<M, S>> = (
  metadata: ModuleMetadata,
  metadataToMock: MockedModuleMetadata,
  deepModuleMock: boolean,
) => MMB;

export abstract class MockedTest extends Test {
  static createMockedModule: MockedModuleBuilderFactory<any, any>;

  static providersFromModules<T>(
    modules: Array<Type<T> | DynamicModule | Promise<DynamicModule> | ForwardReference>,
    deep = true,
  ): Provider[] {
    let providers = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const moduleClass of modules) {
      if (deep) {
        providers = [
          ...providers,
          ...MockedTest.providersFromModules(
            Reflect.getMetadata('imports' as keyof ModuleMetadata, moduleClass) ?? [],
            deep,
          ),
        ];
      }

      const moduleProviders = Reflect.getMetadata('providers' as keyof ModuleMetadata, moduleClass) as Provider[];
      if (moduleProviders?.length) {
        providers = [
          ...providers,
          ...moduleProviders
            .map((provider) => MockedTest.transformFactoryProvider(provider))
            .filter((p) => p !== undefined),
        ];
      }
    }

    return providers;
  }

  protected static transformFactoryProvider<T>(realProvider: Provider): Provider<T> {
    const providerClass = realProvider as ClassProvider;
    const providerFactory = realProvider as FactoryProvider;
    const providerValue = realProvider as ValueProvider;
    const provideAsType = providerFactory.provide as Type<T>;
    const providerAsType = realProvider as Type<T>;

    if (providerFactory.useFactory && typeof provideAsType !== 'function') {
      return undefined;
    }

    if (
      typeof providerAsType === 'function' ||
      ((providerFactory.useFactory || providerValue.useValue) && typeof provideAsType === 'function')
    ) {
      return provideAsType ?? providerAsType;
    }

    return providerClass;
  }
}
