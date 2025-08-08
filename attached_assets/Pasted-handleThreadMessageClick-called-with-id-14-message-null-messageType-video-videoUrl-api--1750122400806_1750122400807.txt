handleThreadMessageClick called with: {id: 14, message: null, messageType: 'video', videoUrl: '/api/videos/bunny-proxy/53c24430-78a9-4d5b-be24-4bc2d3b2c237', bunnyVideoId: '53c24430-78a9-4d5b-be24-4bc2d3b2c237', …}
Console.js:61 State setters called for message: {id: 14, message: null, messageType: 'video', videoUrl: '/api/videos/bunny-proxy/53c24430-78a9-4d5b-be24-4bc2d3b2c237', bunnyVideoId: '53c24430-78a9-4d5b-be24-4bc2d3b2c237', …}
Console.js:61 🔴 VideoRejectionModal: isOpen is FALSE. Returning null.
Console.js:61 🔄 State change detected - showThreadMessageRejectionModal: false
Console.js:61 🔄 State change detected - selectedThreadMessage: {id: 14, message: null, messageType: 'video', videoUrl: '/api/videos/bunny-proxy/53c24430-78a9-4d5b-be24-4bc2d3b2c237', bunnyVideoId: '53c24430-78a9-4d5b-be24-4bc2d3b2c237', …}
Console.js:61 🟢 VideoRejectionModal: isOpen is TRUE. Attempting to render HTML now!
Console.js:61 🔄 State change detected - showThreadMessageRejectionModal: true
Console.js:61 🔄 State change detected - selectedThreadMessage: {id: 14, message: null, messageType: 'video', videoUrl: '/api/videos/bunny-proxy/53c24430-78a9-4d5b-be24-4bc2d3b2c237', bunnyVideoId: '53c24430-78a9-4d5b-be24-4bc2d3b2c237', …}
Console.js:61 ⏰ Delayed check - modal should be open now
Console.js:61 🟢 VideoRejectionModal: isOpen is TRUE. Attempting to render HTML now!
queryClient.ts:40 
            
            
           DELETE https://b0005152-2369-429c-b74b-ddc8ecf0fc24-00-1xknbi8eytqcw.worf.replit.dev/api/thread-messages/14 500 (Internal Server Error)
window.fetch @ Network.js:219
apiRequest @ queryClient.ts:40
mutationFn @ VideoRejectionModal.tsx:83
fn @ @tanstack_react-query.js?v=39a88b9d:1189
run @ @tanstack_react-query.js?v=39a88b9d:494
start @ @tanstack_react-query.js?v=39a88b9d:536
execute @ @tanstack_react-query.js?v=39a88b9d:1225
await in execute
mutate @ @tanstack_react-query.js?v=39a88b9d:2630
(anonymous) @ @tanstack_react-query.js?v=39a88b9d:3295
handleDeleteVideo @ VideoRejectionModal.tsx:112
callCallback2 @ chunk-RPCDYKBN.js?v=39a88b9d:3674
invokeGuardedCallbackDev @ chunk-RPCDYKBN.js?v=39a88b9d:3699
invokeGuardedCallback @ chunk-RPCDYKBN.js?v=39a88b9d:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-RPCDYKBN.js?v=39a88b9d:3736
executeDispatch @ chunk-RPCDYKBN.js?v=39a88b9d:7014
processDispatchQueueItemsInOrder @ chunk-RPCDYKBN.js?v=39a88b9d:7034
processDispatchQueue @ chunk-RPCDYKBN.js?v=39a88b9d:7043
dispatchEventsForPlugins @ chunk-RPCDYKBN.js?v=39a88b9d:7051
(anonymous) @ chunk-RPCDYKBN.js?v=39a88b9d:7174
batchedUpdates$1 @ chunk-RPCDYKBN.js?v=39a88b9d:18913
batchedUpdates @ chunk-RPCDYKBN.js?v=39a88b9d:3579
dispatchEventForPluginEventSystem @ chunk-RPCDYKBN.js?v=39a88b9d:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-RPCDYKBN.js?v=39a88b9d:5478
dispatchEvent @ chunk-RPCDYKBN.js?v=39a88b9d:5472
dispatchDiscreteEvent @ chunk-RPCDYKBN.js?v=39a88b9d:5449Understand this error
Console.js:61 Video comment deletion error: Error: 500: {"message":"Failed to delete thread message"}
    at throwIfResNotOk (queryClient.ts:31:11)
    at async apiRequest (queryClient.ts:47:3)
Mt.forEach.n.<computed> @ Console.js:61
onError @ VideoRejectionModal.tsx:99
execute @ @tanstack_react-query.js?v=39a88b9d:1254
await in execute
mutate @ @tanstack_react-query.js?v=39a88b9d:2630
(anonymous) @ @tanstack_react-query.js?v=39a88b9d:3295
handleDeleteVideo @ VideoRejectionModal.tsx:112
callCallback2 @ chunk-RPCDYKBN.js?v=39a88b9d:3674
invokeGuardedCallbackDev @ chunk-RPCDYKBN.js?v=39a88b9d:3699
invokeGuardedCallback @ chunk-RPCDYKBN.js?v=39a88b9d:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-RPCDYKBN.js?v=39a88b9d:3736
executeDispatch @ chunk-RPCDYKBN.js?v=39a88b9d:7014
processDispatchQueueItemsInOrder @ chunk-RPCDYKBN.js?v=39a88b9d:7034
processDispatchQueue @ chunk-RPCDYKBN.js?v=39a88b9d:7043
dispatchEventsForPlugins @ chunk-RPCDYKBN.js?v=39a88b9d:7051
(anonymous) @ chunk-RPCDYKBN.js?v=39a88b9d:7174
batchedUpdates$1 @ chunk-RPCDYKBN.js?v=39a88b9d:18913
batchedUpdates @ chunk-RPCDYKBN.js?v=39a88b9d:3579
dispatchEventForPluginEventSystem @ chunk-RPCDYKBN.js?v=39a88b9d:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-RPCDYKBN.js?v=39a88b9d:5478
dispatchEvent @ chunk-RPCDYKBN.js?v=39a88b9d:5472
dispatchDiscreteEvent @ chunk-RPCDYKBN.js?v=39a88b9d:5449Understand this error
Console.js:61 🟢 VideoRejectionModal: isOpen is TRUE. Attempting to render HTML now!