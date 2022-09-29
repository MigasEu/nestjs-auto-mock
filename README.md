# NestJS Auto Mock

<span style="font-family:Papyrus; font-size:2em; color:red">Do not install this directly, choose one of it's [implementations](#-actual-implementations).</span>

This is the an abstract module meant to extend the normal NestJS' testing module, adding an easy way to mock dependencies from the service/controller being tested.

It adds auto mocking of given providers, being it directly or a given module(s) providers.

The mocked service used depends on the actual implementation.

## Actual Implementations

- TS-Mockito - <https://github.com/MigasEu/nestjs-auto-mockito>

Currently the only implementation available is for ts-mockito.

Feel free to create your own with different mocking tools.
If you do so, let us know and we'll add it to the list.

## Features

### Automatically mocking providers

Automatically reads module like metadata and finds what providers can be mocked.
It will create a mock and an instance for each one of those.
How the mock and instance is created depends on the actual implementation.

Instance is provided to nest's testing module like any other provider and the mock is stored, allowing the user to get it easily, with the `.getMock()` function.

#### Exceptions

Most providers will be automatically mocked, unless we can't find a corresponding *Class* for that provider.
When a provider is configured as a factory and a string identifier (`provide`), we do not know what to mock, so it is ignored.

Example: `{ provide: 'providerIdentifier', useFactory: () => { return {a: 1}; }}`

You can create and add [add-ons](#add-ons) to avoid this issue.

### Mocking providers of a given module

It can reads the metadata for existing modules recursively to create mocks for all the providers withing that module, including nested ones.

### Add-ons

To deal with edge cases, where we do not know what to mock, we allow additional special rules.
There are two types of add-ons:

- Add a `ProviderMetadataTransformFactoryCustom` through the static method `MockedTest.addCustomProviderMetadataTransformFactoryCustom`,
to create a special rule for metadata creation (and leave the normal mocking behavior based on that metadata),
- Add a `ProviderMockFunctionCustom` through the static method `MockedTest.addCustomProviderMockFunction`,
to add a special rule for the creation of a mock (mock factory).

Both have the same idea, with a check function to see if this rule should apply and the a factory to create, respectively,
normal module metadata, to be interpreted later to find what need to be mocked,
and the final metadata with the actual instance to be provided to nest's TestingModule.

On the case of a `ProviderMockFunctionCustom`, the mock object should be added to the `mockMap` by hand,
or the `mockProviderNormalMockFunction` should be called, which would do that normally.

Check creation example [here](#addon-creation-example)

#### Known Add-ons

- Typeorm - [nestjs-auto-mock-typeorm](https://github.com/MigasEu/nestjs-auto-mock-typeorm)

## Usage Example

This example uses the ts-mockito implementation, with the .

```typescript
  beforeEach(async () => {
    const app = await MockitoTest.createMockitoModule(
      // Real metadata (will start a real service instance)
      {
        providers: [SomeService],
      },
      // Metadata to mock (Providers under SomeModule will also be mocked)
      {
        providers: [
          // Mocking directly a given provider
          {
            provide: getLoggerToken(SomeService.name),
            useClass: PinoLogger,
          },
          MailerService,
        ],
        // Mocking all providers found (deep) inside a given Module
        imports: [SomeModule],
      },
    ).compileMocked();

    service = app.get<SomeService>(SomeService);
    repositoryMock = app.getMock<Repository<SomeEntity>>(
      getRepositoryToken(SomeEntity),
    );
    configMock = app.getMock(ConfigService);
    mailerService = app.getMock(MailerService);
  });

  // (...)

  it('should have only main price', async () => {
    // (...)

    when(repositoryMock.create(anything() as SomeEntity)).thenReturn(SomeEntity);
    when(repositoryMock.save(anything())).thenResolve(SomeEntity);

    const result = await service.create(createDto);

    expect(result).toEqual({ newSomeEntity: SomeEntity, session: stripeSession });
    verify(repositoryMock.create(deepEqual(createDto))).once();
    verify(
    repositoryMock.save(
        deepEqual(
        Object.assign(new SomeEntity(), {
            ...SomeEntity,
            active: false,
        }),
        ),
    ),
    ).once();
  });
```

### Addon creation example

```
export const repositoryProviderCheck: ProviderMetadataTransformCheck = <T>(
  providerToMock: Provider<T>,
  metadataModuleMetadata: Type<T> | DynamicModule | Promise<DynamicModule> | ForwardReference,
) => {
  const dynamicModule = metadataModuleMetadata as DynamicModule;

  return dynamicModule.module?.name === TypeOrmModule.name && 'targetEntitySchema' in providerToMock;
};

export const repositoryProviderFactory: ProviderMetadataTransformFactory = <T>(providerToMock: Provider<T>) => {
  const providerFactory = providerToMock as FactoryProvider;

  const cleanedProviderToMock: FactoryProvider<T> = {
    ...providerToMock,
    useFactory: undefined,
  } as FactoryProvider<T>;

  return {
    ...cleanedProviderToMock,
    provide: providerFactory.provide,
    useClass: Repository,
  } as ClassProvider;
};

export const repositoryCustomProvider: ProviderMetadataTransformFactoryCustom = {
  check: repositoryProviderCheck,
  providerFunction: repositoryProviderFactory,
};

export const init = <T extends typeof MockedTest>(mockedTest: T = MockedTest as T) =>
  mockedTest.addCustomProviderMetadataTransformFactoryCustom(repositoryCustomProvider);
```
