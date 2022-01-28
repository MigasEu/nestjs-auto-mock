import {
  Abstract,
  DynamicModule,
  HttpServer,
  INestApplication,
  INestApplicationContext,
  INestMicroservice,
  LoggerService,
  LogLevel,
  NestApplicationOptions,
  ShutdownSignal,
  Type,
} from '@nestjs/common';
import { NestMicroserviceOptions } from '@nestjs/common/interfaces/microservices/nest-microservice-options.interface';
import { AbstractHttpAdapter, ContextId } from '@nestjs/core';
import { TestingModule, TestingModuleBuilder } from '@nestjs/testing';

export type PublicPart<T> = { [K in keyof T]: T[K] };

export abstract class MockedModule<M, S>
  implements Omit<Omit<PublicPart<TestingModule>, 'init'>, 'enableShutdownHooks'>
{
  constructor(protected parent: TestingModule) {}

  abstract getMock<TInput = any>(typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol): M;

  abstract getSpy<TInput = any>(typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol): S;

  createNestApplication<T extends INestApplication = INestApplication>(
    httpAdapter?: HttpServer | AbstractHttpAdapter,
    options?: NestApplicationOptions,
  ): T {
    return this.parent.createNestApplication(httpAdapter, options);
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  createNestMicroservice<T extends object>(options: NestMicroserviceOptions & T): INestMicroservice {
    return this.parent.createNestMicroservice(options);
  }

  selectContextModule(): void {
    return this.parent.selectContextModule();
  }

  select<T>(moduleType: Type<T> | DynamicModule): INestApplicationContext {
    return this.parent.select(moduleType);
  }

  get<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    options?: {
      strict: boolean;
    },
  ): TResult {
    return this.parent.get(typeOrToken, options);
  }

  resolve<TInput = any, TResult = TInput>(
    typeOrToken: Type<TInput> | Abstract<TInput> | string | symbol,
    contextId?: ContextId,
    options?: {
      strict: boolean;
    },
  ): Promise<TResult> {
    return this.parent.resolve(typeOrToken, contextId, options);
  }

  registerRequestByContextId<T = any>(request: T, contextId: ContextId): void {
    return this.parent.registerRequestByContextId(request, contextId);
  }

  async init(): Promise<this> {
    await this.parent.init();
    return this;
  }

  close(): Promise<void> {
    return this.parent.close();
  }

  useLogger(logger: LoggerService | LogLevel[] | false): void {
    return this.parent.useLogger(logger);
  }

  enableShutdownHooks(signals?: (ShutdownSignal | string)[]): this {
    this.parent.enableShutdownHooks(signals);
    return this;
  }
}

export abstract class MockedModuleBuilder<M, S, MM = MockedModule<M, S>> extends TestingModuleBuilder {
  abstract compileMocked(): Promise<MM>;
}
