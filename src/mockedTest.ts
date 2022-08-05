/* eslint-disable @typescript-eslint/no-unused-vars */
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

import { MockedModuleBuilder, MockMap, TypeOrToken } from './mockedModule';

export type MockedModuleMetadata = Omit<Omit<ModuleMetadata, 'controllers'>, 'exports'>;

export type MockedModuleBuilderFactory<M, S, MMB = MockedModuleBuilder<M, S>> = (
  metadata: ModuleMetadata,
  metadataToMock: MockedModuleMetadata,
  deepModuleMock: boolean,
) => MMB;

export type ProviderMetadataTransformCheck = <T>(
  realProvider: Provider<T>,
  metadataModuleMetadata: Type<T> | DynamicModule | Promise<DynamicModule> | ForwardReference,
) => boolean;
export type ProviderMetadataTransformFactory = <T>(
  providerToMock: Provider<T>,
  metadataModuleMetadata: Type<T> | DynamicModule | Promise<DynamicModule> | ForwardReference,
) => Provider<T>;
export type ProviderMetadataTransformFactoryCustom = {
  check: ProviderMetadataTransformCheck;
  providerFunction: ProviderMetadataTransformFactory;
};

export type ProviderMockFunctionCheck = <T>(
  provider: Provider<T>,
  metadataModuleMetadata: MockedModuleMetadata,
  mockMap: MockMap,
) => boolean;
export type ProviderMockFunction = <T>(
  providerToMock: Provider<T>,
  mockMap: MockMap,
  metadataModuleMetadata: MockedModuleMetadata,
  mockProviderNormalMockFunction: typeof MockedTest.mockProvider,
) => Provider<T>;
export type ProviderMockFunctionCustom = {
  check: ProviderMockFunctionCheck;
  providerFunction: ProviderMockFunction;
};

export class MockedTest extends Test {
  protected static customProviderMetadataTransformFactory: ProviderMetadataTransformFactoryCustom[] = [];
  protected static customProviderMockFunction: ProviderMockFunctionCustom[] = [];

  static mockedModuleBuilderFactory<M, S>(
    _mockMap: MockMap,
    _mergedMetadata: ModuleMetadata,
  ): MockedModuleBuilder<M, S> {
    throw new Error('Missing mockedModuleBuilderFactory implementation!');
  }

  protected static createMockedModule<M, S>(
    metadata: ModuleMetadata = {},
    metadataToMock: MockedModuleMetadata = {},
    deepModuleMocked = true,
  ): MockedModuleBuilder<M, S> {
    const { mockMap, mockedMetadata } = this.createMockedMetadata(metadataToMock, deepModuleMocked);

    const mergedMetadata: ModuleMetadata = {
      ...metadata,
      providers: [...(mockedMetadata.providers ?? []), ...(metadata.providers ?? [])],
    };

    return this.mockedModuleBuilderFactory(mockMap, mergedMetadata);
  }

  static providersFromModules<T>(
    modules: Array<Type<T> | DynamicModule | Promise<DynamicModule> | ForwardReference>,
    deep = true,
  ): Provider[] {
    let providers = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const moduleClass of modules) {
      const modulePlainMetadata = moduleClass as DynamicModule;
      if (deep) {
        const innerImports =
          Reflect.getMetadata('imports' as keyof ModuleMetadata, moduleClass) ?? modulePlainMetadata.imports;
        providers = [...providers, ...this.providersFromModules(innerImports ?? [], deep)];
      }

      const moduleProviders =
        (Reflect.getMetadata('providers' as keyof ModuleMetadata, moduleClass) as Provider[]) ??
        modulePlainMetadata.providers;
      if (moduleProviders?.length) {
        providers = [
          ...providers,
          ...moduleProviders
            .map((provider) => this.transformFactoryProvider(provider, moduleClass))
            .filter((p) => p !== undefined),
        ];
      }
    }

    return providers;
  }

  protected static transformFactoryProvider<T>(
    realProvider: Provider,
    metadataModuleMetadata: Type<T> | DynamicModule | Promise<DynamicModule> | ForwardReference,
  ): Provider<T> {
    const customProviderTransformFactory = this.customProviderMetadataTransformFactory.find((custom) => {
      return custom.check(realProvider, metadataModuleMetadata);
    });

    if (customProviderTransformFactory) {
      return customProviderTransformFactory.providerFunction(realProvider, metadataModuleMetadata);
    }

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

  static createMockedMetadata(
    metadataToMock: MockedModuleMetadata,
    deepModuleMocked = true,
  ): {
    mockedMetadata: ModuleMetadata;
    mockMap: MockMap;
  } {
    const mockMap: MockMap = new Map<TypeOrToken<any>, any>();
    const mockedMetadata: MockedModuleMetadata = {};
    const allProviders = [
      ...this.providersFromModules(metadataToMock.imports ?? [], deepModuleMocked),
      ...(metadataToMock.providers ?? []),
    ];

    mockedMetadata.providers = allProviders.map((provider) => {
      const customFunction = this.customProviderMockFunction.find((customProviderMockFunction) =>
        customProviderMockFunction.check(provider, metadataToMock, mockMap),
      );

      if (customFunction) {
        return customFunction.providerFunction(provider, mockMap, metadataToMock, this.mockProvider);
      }
      return this.mockProvider(provider, mockMap, metadataToMock);
    });

    return {
      mockedMetadata,
      mockMap,
    };
  }

  static mockProvider<T>(
    _providerToMock: Provider<T>,
    _mockMap: MockMap,
    _metadataToMock: MockedModuleMetadata,
  ): Provider<T> {
    throw new Error('Missing mockProvider implementation in child!');
  }

  static addCustomProviderMetadataTransformFactoryCustom(
    providerMetadataTransformFactoryCustom: ProviderMetadataTransformFactoryCustom,
  ) {
    this.customProviderMetadataTransformFactory.push(providerMetadataTransformFactoryCustom);
  }

  static addCustomProviderMockFunction(providerMockFunctionCustom: ProviderMockFunctionCustom) {
    this.customProviderMockFunction.push(providerMockFunctionCustom);
  }
}
