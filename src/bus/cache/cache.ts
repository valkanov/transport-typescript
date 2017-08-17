import { Message } from '../message.model';
import { MessageBusEnabled, MessagebusService } from '../messagebus.service';
import { StompParser } from '../../bridge/stomp.parser';
import { Observable } from 'rxjs/Observable';
import { CacheStateChange, CacheStreamImpl, UUID } from './cache.model';
import { BusCache, CacheStream } from './cache.api';

/**
 * Copyright(c) VMware Inc. 2017
 */

export class CacheImpl implements BusCache, MessageBusEnabled {

    getName(): string {
        return 'BusCache';
    }

    private cache: Map<UUID, any>;
    private cacheStreamChan: string = 'cache-change-' + StompParser.genUUID();

    public static getObjectChannel(id: UUID): UUID {
        return 'cache-object-' + id;
    }

    constructor(private bus: MessagebusService) {
        this.cache = new Map<UUID, any>();
    }

    private sendChangeBroadcast<T, V>(changeType: T, id: UUID, value: V): void {

        const stateChange: CacheStateChange<T, V> = new CacheStateChange<T, V>(id, changeType, value);
        this.bus.sendResponseMessage(
            this.cacheStreamChan,
            stateChange,
            null,
            this.getName()
        );

        this.bus.sendResponseMessage(
            CacheImpl.getObjectChannel(id),
            stateChange,
            null,
            this.getName()
        );
    }

    populateCache<T>(items: Map<UUID, T>): boolean {
        if (this.cache.size === 0) {
            this.cache = items;
            return true;
        }
        return false;
    }

    encache<T, S>(id: UUID, value: T, state: S): void {
        this.cache.set(id, value);
        this.sendChangeBroadcast(state, id, value);
    }

    retrieve<T>(id: UUID): T {
        return this.cache.get(id);
    }

    remove<S>(id: UUID, state: S): boolean {
        if (this.cache.has(id)) {
            this.sendChangeBroadcast(state, id, this.cache.get(id));
            this.cache.delete(id);
            this.bus.close(CacheImpl.getObjectChannel(id), this.getName());
            return true;
        }
        return false;
    }

    notifyOnChange<S, T>(id: UUID, stateChangeType: S): CacheStream<T> {

        const stream: Observable<CacheStateChange<S, T>> =
            this.bus.getChannel(CacheImpl.getObjectChannel(id), this.getName())
                .map(
                    (msg: Message) => {
                        return msg.payload as CacheStateChange<S, T>;
                    }
                );

        const filterStream: Observable<T> =
            stream.filter(
                (state: CacheStateChange<S, T>) => {
                    return (stateChangeType === state.type);
                }
            ).map(
                (stateChange: CacheStateChange<S, T>) => {
                    return stateChange.value;
                }
            );

        return new CacheStreamImpl<T>(filterStream);
    }

    notifyOnAllChanges<T, S>(objectType: T, stateChangeType: S): CacheStream<T> {

        const stream: Observable<CacheStateChange<S, T>> =
            this.bus.getChannel(this.cacheStreamChan, this.getName())
                .map(
                    (msg: Message) => {
                        return msg.payload as CacheStateChange<S, T>;
                    }
                );

        const filterStream: Observable<T> =
            stream.filter(
                (state: CacheStateChange<S, T>) => {
                    return (stateChangeType === state.type);
                }
            ).filter(
                (state: CacheStateChange<S, T>) => {

                    const compareKeys = (a: T, b: T): boolean => {
                        const aKeys = Object.keys(a).sort();
                        const bKeys = Object.keys(b).sort();
                        return JSON.stringify(aKeys) === JSON.stringify(bKeys);
                    };

                    return compareKeys(objectType, state.value);
                }
            ).map(
                (stateChange: CacheStateChange<S, T>) => {
                    return stateChange.value;
                }
            );

        return new CacheStreamImpl<T>(filterStream);
    }

    resetCache(): void {
        this.cache.clear();
    }

}
