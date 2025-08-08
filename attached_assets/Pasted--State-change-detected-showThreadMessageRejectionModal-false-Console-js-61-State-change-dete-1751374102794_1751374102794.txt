🔄 State change detected - showThreadMessageRejectionModal: false
Console.js:61 🔄 State change detected - selectedThreadMessage: null
Console.js:61 🔄 Checking for group video restoration context: false 0 loading: true
Console.js:61 🔄 Checking for group video restoration context: false 0 loading: true
queryClient.ts:57 
            
            
           GET https://b0005152-2369-429c-b74b-ddc8ecf0fc24-00-1xknbi8eytqcw.worf.replit.dev/api/groups/0a82e3c5-3698-4b59-a925-a6d86898e177/membership 401 (Unauthorized)
window.fetch @ Network.js:219
(anonymous) @ queryClient.ts:57
fetchFn @ @tanstack_react-query.js?v=0aec14a9:840
run @ @tanstack_react-query.js?v=0aec14a9:494
start @ @tanstack_react-query.js?v=0aec14a9:536
fetch @ @tanstack_react-query.js?v=0aec14a9:926
executeFetch_fn @ @tanstack_react-query.js?v=0aec14a9:2211
onSubscribe @ @tanstack_react-query.js?v=0aec14a9:1898
subscribe @ @tanstack_react-query.js?v=0aec14a9:24
(anonymous) @ @tanstack_react-query.js?v=0aec14a9:3022
subscribeToStore @ chunk-RPCDYKBN.js?v=0aec14a9:11984
commitHookEffectListMount @ chunk-RPCDYKBN.js?v=0aec14a9:16915
commitPassiveMountOnFiber @ chunk-RPCDYKBN.js?v=0aec14a9:18156
commitPassiveMountEffects_complete @ chunk-RPCDYKBN.js?v=0aec14a9:18129
commitPassiveMountEffects_begin @ chunk-RPCDYKBN.js?v=0aec14a9:18119
commitPassiveMountEffects @ chunk-RPCDYKBN.js?v=0aec14a9:18109
flushPassiveEffectsImpl @ chunk-RPCDYKBN.js?v=0aec14a9:19490
flushPassiveEffects @ chunk-RPCDYKBN.js?v=0aec14a9:19447
commitRootImpl @ chunk-RPCDYKBN.js?v=0aec14a9:19416
commitRoot @ chunk-RPCDYKBN.js?v=0aec14a9:19277
performSyncWorkOnRoot @ chunk-RPCDYKBN.js?v=0aec14a9:18895
flushSyncCallbacks @ chunk-RPCDYKBN.js?v=0aec14a9:9119
(anonymous) @ chunk-RPCDYKBN.js?v=0aec14a9:18627Understand this error
Console.js:61 🔄 Checking for group video restoration context: false 0 loading: true
Console.js:61 🔄 Checking for group video restoration context: false 0 loading: false
Console.js:61 GroupProfilePage Render: Modal visibility state: false Selected message: null Render counter: 0
Console.js:61 🔄 Checking for group video restoration context: false 0 loading: false
Network.js:219 Uncaught (in promise) TypeError: Failed to execute 'fetch' on 'Window': '/api/groups' is not a valid HTTP method.
    at window.fetch (Network.js:219:37)
    at apiRequest (queryClient.ts:40:21)
    at Object.mutationFn (groups.tsx:126:14)
    at Object.fn (@tanstack_react-query.js?v=0aec14a9:1189:29)
    at run (@tanstack_react-query.js?v=0aec14a9:494:49)
    at Object.start (@tanstack_react-query.js?v=0aec14a9:536:9)
    at _a6.execute (@tanstack_react-query.js?v=0aec14a9:1225:56)
window.fetch @ Network.js:219
apiRequest @ queryClient.ts:40
mutationFn @ groups.tsx:126
fn @ @tanstack_react-query.js?v=0aec14a9:1189
run @ @tanstack_react-query.js?v=0aec14a9:494
start @ @tanstack_react-query.js?v=0aec14a9:536
execute @ @tanstack_react-query.js?v=0aec14a9:1225
await in execute
mutate @ @tanstack_react-query.js?v=0aec14a9:2630
(anonymous) @ @tanstack_react-query.js?v=0aec14a9:3295
handleCreateGroup @ groups.tsx:227
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