🔄 State change detected - showThreadMessageRejectionModal: false
Console.js:61 🔄 State change detected - selectedThreadMessage: null
Console.js:61 🔄 Checking for group video restoration context: false 0 loading: true
Console.js:61 🔄 Checking for group video restoration context: false 0 loading: true
Console.js:61 🔄 Checking for group video restoration context: false 2 loading: false
Console.js:61 GroupProfilePage Render: Modal visibility state: false Selected message: null Render counter: 0
Console.js:61 GroupProfilePage Render: Modal visibility state: false Selected message: null Render counter: 0
Console.js:61 GroupProfilePage Render: Modal visibility state: false Selected message: null Render counter: 0
group-profile.tsx:2174 Uncaught ReferenceError: VideoPlayerModal is not defined
    at GroupProfilePage (group-profile.tsx:2174:10)
    at renderWithHooks (chunk-RPCDYKBN.js?v=8a2efd69:11548:26)
    at updateFunctionComponent (chunk-RPCDYKBN.js?v=8a2efd69:14582:28)
    at beginWork (chunk-RPCDYKBN.js?v=8a2efd69:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-RPCDYKBN.js?v=8a2efd69:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-RPCDYKBN.js?v=8a2efd69:3699:24)
    at invokeGuardedCallback (chunk-RPCDYKBN.js?v=8a2efd69:3733:39)
    at beginWork$1 (chunk-RPCDYKBN.js?v=8a2efd69:19765:15)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=8a2efd69:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=8a2efd69:19137:13)
GroupProfilePage @ group-profile.tsx:2174
renderWithHooks @ chunk-RPCDYKBN.js?v=8a2efd69:11548
updateFunctionComponent @ chunk-RPCDYKBN.js?v=8a2efd69:14582
beginWork @ chunk-RPCDYKBN.js?v=8a2efd69:15924
callCallback2 @ chunk-RPCDYKBN.js?v=8a2efd69:3674
invokeGuardedCallbackDev @ chunk-RPCDYKBN.js?v=8a2efd69:3699
invokeGuardedCallback @ chunk-RPCDYKBN.js?v=8a2efd69:3733
beginWork$1 @ chunk-RPCDYKBN.js?v=8a2efd69:19765
performUnitOfWork @ chunk-RPCDYKBN.js?v=8a2efd69:19198
workLoopSync @ chunk-RPCDYKBN.js?v=8a2efd69:19137
renderRootSync @ chunk-RPCDYKBN.js?v=8a2efd69:19116
performSyncWorkOnRoot @ chunk-RPCDYKBN.js?v=8a2efd69:18874
flushSyncCallbacks @ chunk-RPCDYKBN.js?v=8a2efd69:9119
(anonymous) @ chunk-RPCDYKBN.js?v=8a2efd69:18627Understand this error
Console.js:61 GroupProfilePage Render: Modal visibility state: false Selected message: null Render counter: 0
Console.js:61 GroupProfilePage Render: Modal visibility state: false Selected message: null Render counter: 0
group-profile.tsx:2174 Uncaught ReferenceError: VideoPlayerModal is not defined
    at GroupProfilePage (group-profile.tsx:2174:10)
    at renderWithHooks (chunk-RPCDYKBN.js?v=8a2efd69:11548:26)
    at updateFunctionComponent (chunk-RPCDYKBN.js?v=8a2efd69:14582:28)
    at beginWork (chunk-RPCDYKBN.js?v=8a2efd69:15924:22)
    at HTMLUnknownElement.callCallback2 (chunk-RPCDYKBN.js?v=8a2efd69:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-RPCDYKBN.js?v=8a2efd69:3699:24)
    at invokeGuardedCallback (chunk-RPCDYKBN.js?v=8a2efd69:3733:39)
    at beginWork$1 (chunk-RPCDYKBN.js?v=8a2efd69:19765:15)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=8a2efd69:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=8a2efd69:19137:13)
GroupProfilePage @ group-profile.tsx:2174
renderWithHooks @ chunk-RPCDYKBN.js?v=8a2efd69:11548
updateFunctionComponent @ chunk-RPCDYKBN.js?v=8a2efd69:14582
beginWork @ chunk-RPCDYKBN.js?v=8a2efd69:15924
callCallback2 @ chunk-RPCDYKBN.js?v=8a2efd69:3674
invokeGuardedCallbackDev @ chunk-RPCDYKBN.js?v=8a2efd69:3699
invokeGuardedCallback @ chunk-RPCDYKBN.js?v=8a2efd69:3733
beginWork$1 @ chunk-RPCDYKBN.js?v=8a2efd69:19765
performUnitOfWork @ chunk-RPCDYKBN.js?v=8a2efd69:19198
workLoopSync @ chunk-RPCDYKBN.js?v=8a2efd69:19137
renderRootSync @ chunk-RPCDYKBN.js?v=8a2efd69:19116
recoverFromConcurrentError @ chunk-RPCDYKBN.js?v=8a2efd69:18736
performSyncWorkOnRoot @ chunk-RPCDYKBN.js?v=8a2efd69:18879
flushSyncCallbacks @ chunk-RPCDYKBN.js?v=8a2efd69:9119
(anonymous) @ chunk-RPCDYKBN.js?v=8a2efd69:18627Understand this error
Console.js:61 The above error occurred in the <GroupProfilePage> component:

    at GroupProfilePage (https://b0005152-2369-429c-b74b-ddc8ecf0fc24-00-1xknbi8eytqcw.worf.replit.dev/src/pages/group-profile.tsx:48:22)
    at Route (https://b0005152-2369-429c-b74b-ddc8ecf0fc24-00-1xknbi8eytqcw.worf.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js?v=8a2efd69:265:16)
    at Switch (https://b0005152-2369-429c-b74b-ddc8ecf0fc24-00-1xknbi8eytqcw.worf.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js?v=8a2efd69:321:17)
    at AuthCheck (https://b0005152-2369-429c-b74b-ddc8ecf0fc24-00-1xknbi8eytqcw.worf.replit.dev/src/components/AuthCheck.tsx:21:37)
    at Route (https://b0005152-2369-429c-b74b-ddc8ecf0fc24-00-1xknbi8eytqcw.worf.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js?v=8a2efd69:265:16)
    at Switch (https://b0005152-2369-429c-b74b-ddc8ecf0fc24-00-1xknbi8eytqcw.worf.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js?v=8a2efd69:321:17)
    at Router
    at Provider (https://b0005152-2369-429c-b74b-ddc8ecf0fc24-00-1xknbi8eytqcw.worf.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/chunk-OXZDJRWN.js?v=8a2efd69:38:15)
    at TooltipProvider (https://b0005152-2369-429c-b74b-ddc8ecf0fc24-00-1xknbi8eytqcw.worf.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=8a2efd69:62:5)
    at QueryClientProvider (https://b0005152-2369-429c-b74b-ddc8ecf0fc24-00-1xknbi8eytqcw.worf.replit.dev/@fs/home/runner/workspace/node_modules/.vite/deps/@tanstack_react-query.js?v=8a2efd69:2805:3)
    at App

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
Mt.forEach.n.<computed> @ Console.js:61
logCapturedError @ chunk-RPCDYKBN.js?v=8a2efd69:14032
update.callback @ chunk-RPCDYKBN.js?v=8a2efd69:14052
callCallback @ chunk-RPCDYKBN.js?v=8a2efd69:11248
commitUpdateQueue @ chunk-RPCDYKBN.js?v=8a2efd69:11265
commitLayoutEffectOnFiber @ chunk-RPCDYKBN.js?v=8a2efd69:17093
commitLayoutMountEffects_complete @ chunk-RPCDYKBN.js?v=8a2efd69:17980
commitLayoutEffects_begin @ chunk-RPCDYKBN.js?v=8a2efd69:17969
commitLayoutEffects @ chunk-RPCDYKBN.js?v=8a2efd69:17920
commitRootImpl @ chunk-RPCDYKBN.js?v=8a2efd69:19353
commitRoot @ chunk-RPCDYKBN.js?v=8a2efd69:19277
performSyncWorkOnRoot @ chunk-RPCDYKBN.js?v=8a2efd69:18895
flushSyncCallbacks @ chunk-RPCDYKBN.js?v=8a2efd69:9119
(anonymous) @ chunk-RPCDYKBN.js?v=8a2efd69:18627Understand this error
chunk-RPCDYKBN.js?v=8a2efd69:9129 Uncaught ReferenceError: VideoPlayerModal is not defined
    at GroupProfilePage (group-profile.tsx:2174:10)
    at renderWithHooks (chunk-RPCDYKBN.js?v=8a2efd69:11548:26)
    at updateFunctionComponent (chunk-RPCDYKBN.js?v=8a2efd69:14582:28)
    at beginWork (chunk-RPCDYKBN.js?v=8a2efd69:15924:22)
    at beginWork$1 (chunk-RPCDYKBN.js?v=8a2efd69:19753:22)
    at performUnitOfWork (chunk-RPCDYKBN.js?v=8a2efd69:19198:20)
    at workLoopSync (chunk-RPCDYKBN.js?v=8a2efd69:19137:13)
    at renderRootSync (chunk-RPCDYKBN.js?v=8a2efd69:19116:15)
    at recoverFromConcurrentError (chunk-RPCDYKBN.js?v=8a2efd69:18736:28)
    at performSyncWorkOnRoot (chunk-RPCDYKBN.js?v=8a2efd69:18879:28)
GroupProfilePage @ group-profile.tsx:2174
renderWithHooks @ chunk-RPCDYKBN.js?v=8a2efd69:11548
updateFunctionComponent @ chunk-RPCDYKBN.js?v=8a2efd69:14582
beginWork @ chunk-RPCDYKBN.js?v=8a2efd69:15924
beginWork$1 @ chunk-RPCDYKBN.js?v=8a2efd69:19753
performUnitOfWork @ chunk-RPCDYKBN.js?v=8a2efd69:19198
workLoopSync @ chunk-RPCDYKBN.js?v=8a2efd69:19137
renderRootSync @ chunk-RPCDYKBN.js?v=8a2efd69:19116
recoverFromConcurrentError @ chunk-RPCDYKBN.js?v=8a2efd69:18736
performSyncWorkOnRoot @ chunk-RPCDYKBN.js?v=8a2efd69:18879
flushSyncCallbacks @ chunk-RPCDYKBN.js?v=8a2efd69:9119
(anonymous) @ chunk-RPCDYKBN.js?v=8a2efd69:18627Understand this error