import {Initializable} from './initializable.js'

export interface Service {
  aliases?: string[]
  tags?: string[]
  [key: string]: any
}

export interface TaggedService extends Service {
  tags: string[]
}

export interface InitializableService extends Service, Initializable {}
export interface TaggedInitializableService extends TaggedService, Initializable {}
