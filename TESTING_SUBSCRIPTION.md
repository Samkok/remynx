# How to Test the Subscription System

## ✅ Database is Ready
The database schema has been updated and is already in sync. No SQL commands needed!

## 🎯 How to Access Debug Tools

### Option 1: From Profile Tab (Easiest)
1. Open your app in Vibecode
2. Go to the **Profile** tab (bottom navigation)
3. Scroll down to the **Settings** section
4. Tap **"Debug Subscription"** (amber wrench icon)
5. You'll see the debug screen with all testing tools

### Option 2: Direct Navigation
If you want to navigate programmatically:
```typescript
import { router } from 'expo-router';
router.push('/debug-subscription');
```

## 🧪 Testing Flow

### Test 1: Verify Trial is Active
1. Open Debug Subscription screen
2. Check "Current Status" card
3. You should see:
   - ✅ "Has Access" (green checkmark)
   - 📅 "Trial Active" with days remaining
   - Trial start and end dates

### Test 2: Expire Trial & Block Features
1. Tap **"Expire Trial"** (red button)
2. Go back to Home tab
3. Try to create a new work by tapping "More works to be done"
4. **Expected**: Beautiful paywall appears! 🎉
5. Try to add an achievement to an existing work
6. **Expected**: Paywall appears again!

### Test 3: Activate Subscription
1. Go back to Debug Subscription screen
2. Tap **"Monthly"** or **"Annual"** (green/purple buttons)
3. Go to Home tab
4. Try creating a work or achievement
5. **Expected**: Works perfectly! No paywall! ✅

### Test 4: Reset Trial
1. Go back to Debug Subscription screen
2. Tap **"Reset Trial"** (amber button)
3. Status should show fresh 14-day trial
4. All features should work again

### Test 5: Sync with RevenueCat
1. Tap **"Sync with RevenueCat"** (blue button)
2. This fetches real subscription status from RevenueCat
3. Status updates automatically

## 📊 What Each Button Does

| Button | What It Does | Use Case |
|--------|-------------|----------|
| **Sync with RevenueCat** (Blue) | Fetches latest status from RevenueCat | Check real subscription after purchase |
| **Expire Trial** (Red) | Sets trial end date to yesterday | Test blocked state immediately |
| **Monthly** (Green) | Activates monthly subscription | Simulate monthly purchase |
| **Annual** (Purple) | Activates annual subscription | Simulate annual purchase |
| **Reset Trial** (Amber) | Starts fresh 2-week trial | Reset to beginning |

## 🎨 Visual Indicators

### Current Status Card Shows:
- ✅ Green checkmark = User has access
- ❌ Red X = User blocked (needs subscription)
- 📅 Calendar = Trial is active
- ⚡ Lightning = Premium subscriber
- Trial days remaining
- Subscription tier (monthly/annual)

## 🔍 Debug Info Displayed

The debug screen shows:
- **Access Status**: Can user create works/achievements?
- **Trial Status**: Active or expired?
- **Subscription Status**: Active subscription and tier
- **Trial Start Date**: When user registered
- **Trial End Date**: When trial expires (2 weeks after start)
- **RevenueCat Status**: Enabled or disabled

## ⚠️ Important Notes

1. **Development Only**: Debug tools only appear in development mode (`__DEV__`)
2. **Database Changes**: All changes persist in the database
3. **No Real Charges**: Test Store products don't charge real money
4. **State Sync**: Changes may take a second to reflect (auto-refreshes)

## 🎯 Quick Test Checklist

- [ ] Open Profile tab and see Debug Subscription button
- [ ] Tap Debug Subscription and see current status
- [ ] Expire trial and confirm paywall appears
- [ ] Activate subscription and confirm features work
- [ ] Reset trial and confirm it starts fresh
- [ ] Sync with RevenueCat and confirm it updates

## 🎉 What Happens When Trial Expires

When a user's trial expires (after 2 weeks):
1. **Home Tab**: Can view works but can't create new ones
2. **Try to Create Work**: Beautiful paywall appears
3. **Try to Add Achievement**: Paywall appears
4. **Paywall Shows**:
   - Days left in trial (if still active)
   - Premium features list
   - Monthly and annual plans with pricing
   - "Best Value" badge on annual plan
   - Purchase and restore buttons

## 💡 Pro Tips

- Use "Expire Trial" for quick testing (faster than waiting 2 weeks!)
- Use "Reset Trial" to start over without recreating user
- Check "Current Status" card to see real-time state
- All changes are reflected immediately in the UI
- Paywall automatically appears when access is blocked

---

**Everything is ready! Just refresh your app and go to Profile > Debug Subscription to start testing!**
