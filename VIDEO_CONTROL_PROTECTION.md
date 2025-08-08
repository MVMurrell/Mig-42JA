# 🚨 CRITICAL VIDEO CONTROL CODE PROTECTION

## ⚠️ DO NOT MODIFY WITHOUT READING THIS DOCUMENT

### Critical Files Protected:
- `client/src/components/VideoPlayerModal.tsx` (Profile video scroll)
- `client/src/components/VideoFeedModal.tsx` (Map video activation)

### Critical Code Sections:

#### 1. Scroll Debouncing (300ms timeout)
**Location**: Lines ~32-61 in both files
**Purpose**: Prevents rapid-fire video index changes during scrolling
**Critical Values**:
- `300ms` debounce timeout - DO NOT REDUCE
- `{ passive: true }` event listener option

#### 2. Video Control Race Prevention 
**Location**: Lines ~63-116 in both files
**Purpose**: Prevents "AbortError: play() interrupted by pause()" 
**Critical Features**:
- `Promise.allSettled()` for stopping all videos first
- `200ms` timer delay for operation separation
- `50ms` wait between operations
- Async/await pattern for proper sequencing

### Why This Code Is Critical:

1. **Scroll-based video navigation** triggers rapid state changes
2. **Without debouncing**: Multiple video play/pause commands conflict
3. **Without proper sequencing**: Videos interrupt each other causing AbortError
4. **Without race condition prevention**: Audio overlap and playback failures

### Error Symptoms If Broken:
- "AbortError: The play() request was interrupted by a call to pause()"
- Videos not playing when scrolling
- Audio from multiple videos playing simultaneously
- Rapid console logging of video state changes

### Safe Modifications:
- ✅ Adding debug logging
- ✅ Changing video UI elements (outside useEffect)
- ✅ Adding new video metadata handling

### Dangerous Modifications:
- ❌ Reducing timeout values (300ms, 200ms, 50ms)
- ❌ Removing Promise.allSettled()
- ❌ Changing scroll event handling
- ❌ Removing async/await patterns
- ❌ Modifying the video stop/play sequence

### If You Must Modify:
1. Create a backup of working code
2. Test thoroughly with rapid scrolling
3. Monitor console for AbortError messages
4. Test on multiple browsers/devices
5. Verify no audio overlap occurs

### Testing Checklist:
- [ ] Profile videos scroll smoothly without errors
- [ ] Map videos activate without conflicts  
- [ ] No "AbortError" messages in console
- [ ] Only one video plays audio at a time
- [ ] Rapid scrolling doesn't break playback
- [ ] Video transitions are clean and responsive

---
**Last Working Version**: June 3, 2025
**Original Problem**: Scroll-based video controls causing play/pause race conditions
**Solution**: Debounced scrolling + Promise-based video control sequencing