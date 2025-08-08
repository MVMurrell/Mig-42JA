🔍 DELETE DEBUG: currentItem structure: {id: 73, isVideoComment: true, isThreadMessage: true, allKeys: Array(12)}
Console.js:61 🗑️ DELETE REQUEST: Thread message - endpoint /api/thread-messages/73
queryClient.ts:53 
            
            
           DELETE https://b0005152-2369-429c-b74b-ddc8ecf0fc24-00-1xknbi8eytqcw.worf.replit.dev/api/thread-messages/73 403 (Forbidden)
window.fetch @ Network.js:219
apiRequest @ queryClient.ts:53
mutationFn @ VideoRejectionModal.tsx:103
fn @ @tanstack_react-query.js?v=0aec14a9:1189
run @ @tanstack_react-query.js?v=0aec14a9:494
start @ @tanstack_react-query.js?v=0aec14a9:536
execute @ @tanstack_react-query.js?v=0aec14a9:1225
await in execute
mutate @ @tanstack_react-query.js?v=0aec14a9:2630
(anonymous) @ @tanstack_react-query.js?v=0aec14a9:3295
handleDeleteVideo @ VideoRejectionModal.tsx:198
callCallback2 @ chunk-RPCDYKBN.js?v=0aec14a9:3674
invokeGuardedCallbackDev @ chunk-RPCDYKBN.js?v=0aec14a9:3699
invokeGuardedCallback @ chunk-RPCDYKBN.js?v=0aec14a9:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-RPCDYKBN.js?v=0aec14a9:3736
executeDispatch @ chunk-RPCDYKBN.js?v=0aec14a9:7014
processDispatchQueueItemsInOrder @ chunk-RPCDYKBN.js?v=0aec14a9:7034
processDispatchQueue @ chunk-RPCDYKBN.js?v=0aec14a9:7043
dispatchEventsForPlugins @ chunk-RPCDYKBN.js?v=0aec14a9:7051
(anonymous) @ chunk-RPCDYKBN.js?v=0aec14a9:7174
batchedUpdates$1 @ chunk-RPCDYKBN.js?v=0aec14a9:18913
batchedUpdates @ chunk-RPCDYKBN.js?v=0aec14a9:3579
dispatchEventForPluginEventSystem @ chunk-RPCDYKBN.js?v=0aec14a9:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-RPCDYKBN.js?v=0aec14a9:5478
dispatchEvent @ chunk-RPCDYKBN.js?v=0aec14a9:5472
dispatchDiscreteEvent @ chunk-RPCDYKBN.js?v=0aec14a9:5449Understand this error
Console.js:61 thread message deletion error: TypeError: Failed to execute 'text' on 'Response': body stream already read
    at throwIfResNotOk (queryClient.ts:25:33)
    at async apiRequest (queryClient.ts:75:5)
Mt.forEach.n.<computed> @ Console.js:61
onError @ VideoRejectionModal.tsx:178
execute @ @tanstack_react-query.js?v=0aec14a9:1254
await in execute
mutate @ @tanstack_react-query.js?v=0aec14a9:2630
(anonymous) @ @tanstack_react-query.js?v=0aec14a9:3295
handleDeleteVideo @ VideoRejectionModal.tsx:198
callCallback2 @ chunk-RPCDYKBN.js?v=0aec14a9:3674
invokeGuardedCallbackDev @ chunk-RPCDYKBN.js?v=0aec14a9:3699
invokeGuardedCallback @ chunk-RPCDYKBN.js?v=0aec14a9:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-RPCDYKBN.js?v=0aec14a9:3736
executeDispatch @ chunk-RPCDYKBN.js?v=0aec14a9:7014
processDispatchQueueItemsInOrder @ chunk-RPCDYKBN.js?v=0aec14a9:7034
processDispatchQueue @ chunk-RPCDYKBN.js?v=0aec14a9:7043
dispatchEventsForPlugins @ chunk-RPCDYKBN.js?v=0aec14a9:7051
(anonymous) @ chunk-RPCDYKBN.js?v=0aec14a9:7174
batchedUpdates$1 @ chunk-RPCDYKBN.js?v=0aec14a9:18913
batchedUpdates @ chunk-RPCDYKBN.js?v=0aec14a9:3579
dispatchEventForPluginEventSystem @ chunk-RPCDYKBN.js?v=0aec14a9:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-RPCDYKBN.js?v=0aec14a9:5478
dispatchEvent @ chunk-RPCDYKBN.js?v=0aec14a9:5472
dispatchDiscreteEvent @ chunk-RPCDYKBN.js?v=0aec14a9:5449Understand this error