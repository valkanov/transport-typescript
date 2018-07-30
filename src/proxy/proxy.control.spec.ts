/**
 * Copyright(c) VMware Inc. 2016-2018
 */

import { EventBus } from '../bus.api';
import { Logger, LogLevel } from '../log';
import { BusTestUtil } from '../util/test.util';
import { IFrameProxyControl, ProxyType } from './message.proxy';

fdescribe('Proxy Controls [proxy/proxy.control.ts]', () => {

    let bus: EventBus;
    let log: Logger;

    beforeEach(
        () => {
            bus = BusTestUtil.bootBusWithOptions(LogLevel.Debug, true);
            bus.api.loggerInstance.setStylingVisble(false);
            //bus.api.enableMonitorDump(true);
            bus.api.logger().silent(true);
            log = bus.api.logger();
        }
    );

    it('Basic start up works and property fetching accurate as expected.', () => {
        const control: IFrameProxyControl = bus.enableMessageProxy({
            protectedChannels: ['auth-chan1'],
            proxyType: ProxyType.Parent,
            targetOrigin: ['http://somewhere.out.there'],
            targetAllFrames: true,
            targetSpecificFrames: null
        });

        expect(control.isListening()).toBeTruthy();
        expect(control.getAllowedOrigins().length).toBe(1);
        expect(control.getAllowedOrigins()[0]).toEqual('http://somewhere.out.there');
        expect(control.getTargetedFrames().length).toEqual(0)
        expect(control.isTargetingAllFrames).toBeTruthy();

    });

    it('Check configurations can be changed dynamically via the controller.', () => {
        const control: IFrameProxyControl = bus.enableMessageProxy({
            protectedChannels: ['auth-chan1'],
            proxyType: ProxyType.Parent,
            targetOrigin: ['http://space.dogs'],
            targetAllFrames: false,
            targetSpecificFrames: null
        });

        // check listening
        control.stopListening();
        expect(control.isListening()).toBeFalsy();

        // check allowed origins
        control.addAllowedTargetOrigin('http://space.force');
        expect(control.getAllowedOrigins().length).toEqual(2);
        expect(control.getAllowedOrigins()[1]).toEqual('http://space.force');

        // remove origins
        control.removeAllowedTargetOrigin('http://space.force');
        expect(control.getAllowedOrigins().length).toEqual(1);
        expect(control.getAllowedOrigins()[0]).toEqual('http://space.dogs');

        expect(control.isTargetingAllFrames()).toBeFalsy();

        // add targeted frame
        control.addTargetedFrame('ember');
        expect(control.isTargetingAllFrames()).toBeFalsy();
        expect(control.getTargetedFrames().length).toEqual(1);
        expect(control.getTargetedFrames()[0]).toEqual('ember');

        // add another frame
        control.addTargetedFrame('cotton');
        expect(control.isTargetingAllFrames()).toBeFalsy();
        expect(control.getTargetedFrames().length).toEqual(2);
        expect(control.getTargetedFrames()[1]).toEqual('cotton');

        // remove frame
        control.removeTargetedFrame('ember');
        expect(control.isTargetingAllFrames()).toBeFalsy();
        expect(control.getTargetedFrames().length).toEqual(1);
        expect(control.getTargetedFrames()[0]).toEqual('cotton');

        // toggle all frames
        control.targetAllFrames(true);
        expect(control.isTargetingAllFrames()).toBeFalsy(); // because there are still targeted frames in play.

        // remove last frame
        control.removeTargetedFrame('cotton');
        expect(control.isTargetingAllFrames()).toBeFalsy();
        expect(control.getTargetedFrames().length).toEqual(0);

        // retry toggle.
        control.targetAllFrames(true);
        expect(control.isTargetingAllFrames()).toBeTruthy(); // targeted frames have been removed.

        // check channels
        expect(control.getAuthorizedChannels().length).toEqual(1);
        expect(control.getAuthorizedChannels()[0]).toEqual('auth-chan1');
        control.addAuthorizedChannel('new-chan');
        expect(control.getAuthorizedChannels().length).toEqual(2);
        expect(control.getAuthorizedChannels()[1]).toEqual('new-chan');

        // remove channel
        control.removeAuthorizedChannel('auth-chan1');
        expect(control.getAuthorizedChannels().length).toEqual(1);
        expect(control.getAuthorizedChannels()[0]).toEqual('new-chan');

    });

    describe('Validation & Rule Checking', () => {

        beforeEach(
            () => {
                bus = BusTestUtil.bootBusWithOptions(LogLevel.Debug, true);
                bus.api.logger().silent(true);
                log = bus.api.logger();
            }
        );

        it('Expect the proxy ignores messages with unregistered origin', (done) => {
            spyOn(log, 'warn').and.callThrough();

            bus.enableMessageProxy({
                protectedChannels: ['auth-chan1'],
                proxyType: ProxyType.Parent,
                targetOrigin: ['http://something.else'], // not what will come through
                targetAllFrames: true,
                targetSpecificFrames: null
            });

            bus.api.tickEventLoop(
                () => {
                    window.postMessage('hello melody!','*'); // send message, origin is local karma
                }
            );

            bus.api.tickEventLoop(
                () => {
                    expect(log.warn)
                        .toHaveBeenCalledWith('Message refused, origin not registered: http://localhost:9876'
                            , 'MessageProxy');
                    done();
                },5
            );
        });

        it('Expect the proxy ignores messages not intended for the bus (regular string)', (done) => {
            spyOn(log, 'debug').and.callThrough();

            bus.enableMessageProxy({
                protectedChannels: ['auth-chan1'],
                proxyType: ProxyType.Parent,
                targetOrigin: ['http://localhost:9876'], // local karma
                targetAllFrames: true,
                targetSpecificFrames: null
            });

            bus.api.tickEventLoop(
                () => {
                    window.postMessage('hello melody!','*'); // send message, origin is local karma
                }
            );

            bus.api.tickEventLoop(
                () => {
                    expect(log.debug)
                        .toHaveBeenCalledWith('Message Ignored, not intended for the bus.', 'MessageProxy');
                    done();
                },5
            );
        });

        it('Expect the proxy ignores messages not intended for the bus (object)', (done) => {
            spyOn(log, 'debug').and.callThrough();

            bus.enableMessageProxy({
                protectedChannels: ['auth-chan1'],
                proxyType: ProxyType.Parent,
                targetOrigin: ['http://localhost:9876'], // local karma
                targetAllFrames: true,
                targetSpecificFrames: null
            });

            bus.api.tickEventLoop(
                () => {
                    window.postMessage({ data: 'hi fox!'},'*'); // send message, origin is local karma
                }
            );

            bus.api.tickEventLoop(
                () => {
                    expect(log.debug)
                        .toHaveBeenCalledWith('Message Ignored, not intended for the bus.', 'MessageProxy');
                    done();
                },5
            );
        });

        it('Expect the proxy ignores messages with no payload', (done) => {
            spyOn(bus.logger, 'debug').and.callThrough();

            bus.enableMessageProxy({
                protectedChannels: ['auth-chan1'],
                proxyType: ProxyType.Parent,
                targetOrigin: ['http://localhost:9876'], // local karma
                targetAllFrames: true,
                targetSpecificFrames: null
            });

            bus.api.tickEventLoop(
                () => {
                    window.postMessage('','*'); // send message, origin is local karma
                }
            );

            bus.api.tickEventLoop(
                () => {
                    expect(bus.logger.debug)
                        .toHaveBeenCalledWith('Message Ignored, it contains no payload', 'MessageProxy');
                    done();
                },5
            );
        });

    });



});