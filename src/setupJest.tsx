import { format } from "util"
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock"
// @ts-expect-error
import mockRNCNetInfo from "@react-native-community/netinfo/jest/netinfo-mock.js"
import "@testing-library/jest-native/extend-expect"
import { ArtsyNativeModule } from "app/NativeModules/ArtsyNativeModule"
import { LegacyNativeModules } from "app/NativeModules/LegacyNativeModules"
import { ScreenDimensionsWithSafeAreas } from "app/utils/hooks"
import { mockPostEventToProviders, mockTrackEvent } from "app/utils/tests/globallyMockedStuff"
import { mockNavigate } from "app/utils/tests/navigationMocks"
import chalk from "chalk"
import expect from "expect"
import "jest-extended"
import { NativeModules } from "react-native"
// @ts-expect-error
import mockSafeAreaContext from "react-native-safe-area-context/jest/mock"
import track, { useTracking } from "react-tracking"
import diff from "snapshot-diff"
// 👇 needed after upgrading to reanimated 3 otherwise tests break
require("setimmediate")
/**
 * General Preparation
 */

// @ts-expect-error
global.__TEST__ = true
declare const process: any

function logToError(type: keyof typeof console, args: unknown[], constructorOpt: () => void) {
  const explanation =
    chalk.white(`Test failed due to \`console.${type}(…)\` call.\n`) +
    chalk.gray("(Disable with ALLOW_CONSOLE_LOGS=true env variable.)\n\n")
  if (args[0] instanceof Error) {
    const msg = explanation + chalk.red(args[0].message)
    const err = new Error(msg)
    err.stack = args[0].stack!.replace(`Error: ${args[0].message}`, msg)
    return err
  } else if (
    // Because we use react-dom in tests to render react-native components, a few warnings are being logged that we do
    // not care for, so ignore these.
    typeof args[0] === "string" &&
    !args[0].includes("is using incorrect casing") &&
    !args[0].includes("is unrecognized in this browser") &&
    ![args[0].includes("React does not recognize the `testID` prop on a DOM element.")]
  ) {
    const err = new Error(explanation + chalk.red(format(args[0], ...args.slice(1))))
    ;(Error as any).captureStackTrace(err, constructorOpt)
    return err
  }
  return null
}

if (process.env.ALLOW_CONSOLE_LOGS !== "true") {
  const originalLoggers = {
    error: console.error,
    warn: console.warn,
  }

  beforeEach((done) => {
    mockTrackEvent.mockClear()
    mockPostEventToProviders.mockClear()
    const types: Array<"error" | "warn"> = ["error", "warn"]
    types.forEach((type) => {
      // Don't spy on loggers that have been modified by the current test.
      if (console[type] === originalLoggers[type]) {
        const handler = (...args: unknown[]) => {
          const error = logToError(type, args, handler)
          if (error) {
            done.fail(error)
          }
        }
        jest.spyOn(console, type).mockImplementation(handler)
      }
    })
    done() // it is important to call this here or every test will timeout
  })
}

// Waiting on https://github.com/thymikee/snapshot-diff/pull/17
expect.extend({ toMatchDiffSnapshot: (diff as any).toMatchDiffSnapshot })

/**
 * External deps mocks
 */

jest.mock("react-native-screens", () => ({
  ...jest.requireActual("react-native-screens"),
  enableScreens: jest.fn(),
}))

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage)

jest.mock("@react-native-community/netinfo", () => mockRNCNetInfo)

jest.mock("react-native-safe-area-context", () => mockSafeAreaContext)

jest.mock("react-native-permissions", () => ({
  requestNotifications: jest.fn(),
}))

require("jest-fetch-mock").enableMocks()

jest.mock("react-tracking")
;(track as jest.Mock).mockImplementation(() => (x: any) => x)
;(useTracking as jest.Mock).mockImplementation(() => ({ trackEvent: mockTrackEvent }))

jest.mock("tipsi-stripe", () => ({
  setOptions: jest.fn(),
  paymentRequestWithCardForm: jest.fn(),
  createTokenWithCard: jest.fn(),
}))

jest.mock("sift-react-native", () => ({
  unsetUserId: jest.fn(),
  setUserId: jest.fn(),
  upload: jest.fn(),
}))

// Mock this separately so react-tracking can be unmocked in tests but not result in the `window` global being accessed.
jest.mock("react-tracking/build/dispatchTrackingEvent")

jest.mock("@react-navigation/native", () => {
  const { useEffect } = require("react")
  const actualNav = jest.requireActual("@react-navigation/native")
  return {
    ...actualNav,
    useFocusEffect: useEffect,
    useNavigation: () => ({
      navigate: mockNavigate,
      dispatch: jest.fn(),
      addListener: jest.fn(),
    }),
  }
})

jest.mock("react-native-webview", () => {
  const React = require("react")
  const { View } = require("react-native")

  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      return <View ref={ref} {...props} />
    }),
  }
})

jest.mock("react-native-share", () => ({
  open: jest.fn(),
}))

jest.mock("react-native-device-info", () => ({
  getBuildNumber: () => "some-build-number",
  getVersion: jest.fn(),
  getModel: () => "testDevice",
  getUserAgentSync: jest.fn(),
  getDeviceType: jest.fn(),
  hasNotch: jest.fn(),
  isTablet: jest.fn(),
}))

jest.mock("rn-fetch-blob", () => ({
  fs: {
    dirs: {
      DocumentDir: "",
    },
  },
}))

jest.mock("@react-native-cookies/cookies", () => ({ clearAll: jest.fn() }))

beforeEach(() => {
  require("@react-native-cookies/cookies").clearAll.mockReset()
})

jest.mock("react-native-fbsdk-next", () => ({
  LoginManager: {
    logOut: jest.fn(),
    logInWithPermissions: jest.fn(),
  },
  AccessToken: {
    getCurrentAccessToken: jest.fn(),
  },
  GraphRequest: jest.fn(),
  GraphRequestManager: jest.fn(() => ({
    addRequest: jest.fn(() => ({
      start: jest.fn(),
    })),
  })),
}))

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    getTokens: jest.fn(),
    hasPlayServices: jest.fn(),
    isSignedIn: jest.fn(),
    revokeAccess: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
}))

jest.mock("@invertase/react-native-apple-authentication", () => ({
  appleAuth: {
    performRequest: jest.fn(),
    Operation: {
      LOGIN: 1,
    },
    Scope: {
      EMAIL: 0,
      FULL_NAME: 1,
    },
  },
}))

jest.mock("@sentry/react-native", () => ({
  captureMessage() {},
  init() {},
  setUser() {},
  addBreadcrumb() {},
  withScope() {},
  Severity: "info",
}))

jest.mock("@react-native-mapbox-gl/maps", () => ({
  MapView: () => null,
  StyleURL: {
    Light: null,
  },
  setAccessToken: () => jest.fn(),
  StyleSheet: {},
  ShapeSource: () => null,
  SymbolLayer: () => null,
}))

const _ = jest.requireActual("lodash")

jest.mock("react-native-localize", () => ({
  getCountry: jest.fn(() => "US"),
  getLocales() {
    return [
      { countryCode: "US", languageTag: "en-US", languageCode: "en", isRTL: false },
      { countryCode: "FR", languageTag: "fr-FR", languageCode: "fr", isRTL: false },
    ]
  },
  getCurrencies() {
    return ["USD", "EUR"]
  },
  getTimeZone() {
    return "America/New_York"
  },
}))

require("react-native-reanimated/src/reanimated2/jestUtils").setUpTests()

// @ts-expect-error
global.__reanimatedWorkletInit = () => {}

jest.mock("react-native-reanimated", () => {
  const animationMock = {
    duration: () => {
      return jest.fn()
    },
  }

  return {
    ...require("react-native-reanimated/mock"),
    FadeInRight: animationMock,
    FadeInLeft: animationMock,
    FadeIn: {
      duration: () => {
        return { easing: jest.fn() }
      },
    },
    FadeInDown: {
      duration: () => {
        return { easing: jest.fn() }
      },
    },
    FadeOut: {
      duration: () => {
        return { easing: jest.fn() }
      },
    },
    FadeOutRight: animationMock,
  }
})

jest.mock("react-native/Libraries/LayoutAnimation/LayoutAnimation", () => ({
  ...jest.requireActual("react-native/Libraries/LayoutAnimation/LayoutAnimation"),
  configureNext: jest.fn((_config, callback) => callback?.()),
  create: jest.fn(),
  easeInEaseOut: jest.fn(),
  linear: jest.fn(),
  spring: jest.fn(),
}))

jest.mock("react-native-gesture-handler", () => {
  const View = require("react-native/Libraries/Components/View/View")
  const TouchableWithoutFeedback = require("react-native/Libraries/Components/Touchable/TouchableWithoutFeedback")
  const TouchableHighlight = require("react-native/Libraries/Components/Touchable/TouchableHighlight")
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    /* Buttons */
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    /* Other */
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
    TouchableHighlight,
    TouchableWithoutFeedback,
  }
})

jest.mock("react-native-image-crop-picker", () => ({
  openPicker: jest.fn(),
  openCamera: jest.fn(),
  cleanSingle: jest.fn(),
  clean: jest.fn(),
}))

jest.mock("react-native-config", () => {
  const mockConfig = {
    ARTSY_DEV_API_CLIENT_SECRET: "artsy_api_client_secret", // pragma: allowlist secret
    ARTSY_DEV_API_CLIENT_KEY: "artsy_api_client_key", // pragma: allowlist secret
    ARTSY_PROD_API_CLIENT_SECRET: "artsy_api_client_secret", // pragma: allowlist secret
    ARTSY_PROD_API_CLIENT_KEY: "artsy_api_client_key", // pragma: allowlist secret
    ARTSY_FACEBOOK_APP_ID: "artsy_facebook_app_id", // pragma: allowlist secret
    SEGMENT_PRODUCTION_WRITE_KEY_IOS: "segment_production_write_key_ios", // pragma: allowlist secret
    SEGMENT_PRODUCTION_WRITE_KEY_ANDROID: "segment_production_write_key_android", // pragma: allowlist secret
    SEGMENT_STAGING_WRITE_KEY_IOS: "segment_staging_write_key_ios", // pragma: allowlist secret
    SEGMENT_STAGING_WRITE_KEY_ANDROID: "segment_staging_write_key_android", // pragma: allowlist secret
    SENTRY_DSN: "sentry_dsn", // pragma: allowlist secret
    GOOGLE_MAPS_API_KEY: "google_maps_api_key", // pragma: allowlist secret
    MAPBOX_API_CLIENT_KEY: "mapbox_api_client_key", // pragma: allowlist secret
    UNLEASH_PROXY_CLIENT_KEY_PRODUCTION: "unleash_proxy_client_key_production", // pragma: allowlist secret
    UNLEASH_PROXY_CLIENT_KEY_STAGING: "unleash_proxy_client_key_staging", // pragma: allowlist secret
    UNLEASH_PROXY_URL_PRODUCTION: "https://unleash_proxy_url_production", // pragma: allowlist secret
    UNLEASH_PROXY_URL_STAGING: "https://unleash_proxy_url_staging", // pragma: allowlist secret
  }
  // support both default and named export
  return { ...mockConfig, Config: mockConfig }
})

jest.mock("react-native-view-shot", () => ({}))

jest.mock("@segment/analytics-react-native", () => ({
  setup: () => null,
  identify: () => null,
  reset: () => null,
}))

jest.mock("@segment/analytics-react-native-appboy", () => ({}))

jest.mock("react-native-appboy-sdk", () => ({
  ReactAppboy: jest.fn(),
  changeUser: jest.fn(),
}))

jest.mock("react-native-push-notification", () => ({
  configure: jest.fn(),
  onRegister: jest.fn(),
  onNotification: jest.fn(),
  addEventListener: jest.fn(),
  requestPermissions: jest.fn(),
  checkPermissions: jest.fn(),
  createChannel: jest.fn(),
  localNotification: jest.fn(),
}))

jest.mock("react-native-keychain", () => ({
  setInternetCredentials: jest.fn().mockResolvedValue(true),
}))

/**
 * Mocks for our code
 */

// Native modules

type OurNativeModules = typeof LegacyNativeModules & { ArtsyNativeModule: typeof ArtsyNativeModule }

function getNativeModules(): OurNativeModules {
  return {
    ARTNativeScreenPresenterModule: {
      presentAugmentedRealityVIR: jest.fn(),
      presentEmailComposerWithBody: jest.fn(),
      presentEmailComposerWithSubject: jest.fn(),
      presentMediaPreviewController: jest.fn(),
    },
    ARCocoaConstantsModule: {
      UIApplicationOpenSettingsURLString: "UIApplicationOpenSettingsURLString",
      AREnabled: true,
      CurrentLocale: "en_US",
      LocalTimeZone: "",
    },

    ARNotificationsManager: {
      nativeState: {
        userAgent: "Jest Unit Tests",
        authenticationToken: "authenticationToken",
        launchCount: 1,
        userID: "userID",
        userEmail: "user@example.com",
      },
      postNotificationName: jest.fn(),
      didFinishBootstrapping: jest.fn(),
      reactStateUpdated: jest.fn(),
    },
    ARTemporaryAPIModule: {
      fetchNotificationPermissions: jest.fn(),
      markUserPermissionStatus: jest.fn(),
      markNotificationsRead: jest.fn(),
      setApplicationIconBadgeNumber: jest.fn(),
      getUserEmail: jest.fn(),
    },
    ARPHPhotoPickerModule: {
      requestPhotos: jest.fn(),
    },
    ARScreenPresenterModule: {
      switchTab: jest.fn(),
      dismissModal: jest.fn(),
      pushView: jest.fn(),
      goBack: jest.fn(),
      updateShouldHideBackButton: jest.fn(),
      popStack: jest.fn(),
      popToRootAndScrollToTop: jest.fn(),
      popToRootOrScrollToTop: jest.fn(),
      presentModal: jest.fn(),
    },
    AREventsModule: {
      requestAppStoreRating: jest.fn(),
    },
    ArtsyNativeModule: {
      launchCount: 3,
      setAppStyling: jest.fn(),
      setNavigationBarColor: jest.fn(),
      setAppLightContrast: jest.fn(),
      navigationBarHeight: 11,
      lockActivityScreenOrientation: jest.fn(),
      gitCommitShortHash: "de4dc0de",
      isBetaOrDev: true,
      updateAuthState: jest.fn(),
      clearUserData: jest.fn(),
      clearCache: jest.fn(),
    },
  }
}

// ARScreenPresenterModule is no longer a native module on either platform
// so we must mock differently
jest.mock("app/NativeModules/LegacyNativeModules", () => ({
  LegacyNativeModules: {
    ARTNativeScreenPresenterModule: {
      presentAugmentedRealityVIR: jest.fn(),
      presentEmailComposerWithBody: jest.fn(),
      presentEmailComposerWithSubject: jest.fn(),
      presentMediaPreviewController: jest.fn(),
    },
    ARCocoaConstantsModule: {
      UIApplicationOpenSettingsURLString: "UIApplicationOpenSettingsURLString",
      AREnabled: true,
      CurrentLocale: "en_US",
      LocalTimeZone: "",
    },
    ARNotificationsManager: {
      nativeState: {
        userAgent: "Jest Unit Tests",
        authenticationToken: "authenticationToken",
        launchCount: 1,
        userID: "userID",
        userEmail: "user@example.com",
      },
      postNotificationName: jest.fn(),
      didFinishBootstrapping: jest.fn(),
      reactStateUpdated: jest.fn(),
    },
    ARTemporaryAPIModule: {
      fetchNotificationPermissions: jest.fn(),
      markUserPermissionStatus: jest.fn(),
      markNotificationsRead: jest.fn(),
      setApplicationIconBadgeNumber: jest.fn(),
      getUserEmail: jest.fn(),
    },
    ARPHPhotoPickerModule: {
      requestPhotos: jest.fn(),
    },
    ARScreenPresenterModule: {
      switchTab: jest.fn(),
      dismissModal: jest.fn(),
      pushView: jest.fn(),
      goBack: jest.fn(),
      updateShouldHideBackButton: jest.fn(),
      popStack: jest.fn(),
      popToRootAndScrollToTop: jest.fn(),
      popToRootOrScrollToTop: jest.fn(),
      presentModal: jest.fn(),
    },
    AREventsModule: {
      requestAppStoreRating: jest.fn(),
    },
    ArtsyNativeModule: {
      launchCount: 3,
      setAppStyling: jest.fn(),
      setNavigationBarColor: jest.fn(),
      setAppLightContrast: jest.fn(),
      navigationBarHeight: 11,
      lockActivityScreenOrientation: jest.fn(),
      gitCommitShortHash: "de4dc0de",
      isBetaOrDev: true,
      updateAuthState: jest.fn(),
      clearUserData: jest.fn(),
    },
  },
}))

Object.assign(NativeModules, getNativeModules())

beforeEach(() => {
  function reset(a: any, b: any) {
    Object.keys(a).forEach((k) => {
      if (_.isPlainObject(a[k])) {
        reset(a[k], b[k])
      } else {
        if (a[k]?.mockReset) {
          a[k].mockReset()
        } else {
          a[k] = b?.[k] ?? a[k]
        }
      }
    })
  }
  reset(NativeModules, getNativeModules())
  reset(require("app/system/navigation/navigate"), {})
})

const mockedModule = (path: string, mockModuleName: string) => jest.mock(path, () => mockModuleName)
mockedModule("./app/Components/OpaqueImageView/OpaqueImageView.tsx", "AROpaqueImageView")
mockedModule("./app/Components/Gene/Header.tsx", "Header")

jest.mock("app/utils/track/providers", () => ({
  ...jest.requireActual("app/utils/track/providers"),
  postEventToProviders: jest.fn(),
}))

const { createMockEnvironment } = require("relay-test-utils")
let mockEnvironment = createMockEnvironment()
jest.mock("app/system/relay/defaultEnvironment", () => {
  const mockedFunction = () => mockEnvironment
  return {
    getRelayEnvironment: mockedFunction,
    getMockRelayEnvironment: mockedFunction,
    bottomTabsRelayEnvironment: mockEnvironment,
  }
})
const resetMockEnvironment = () => {
  mockEnvironment = createMockEnvironment()
}
// resetting relay mock env before each test is needed, for a clean env to resolve on.
beforeEach(() => {
  resetMockEnvironment()
})

jest.mock("app/utils/hooks", () => {
  const React = require("react")
  const screenDimensions: ScreenDimensionsWithSafeAreas = {
    width: 380,
    height: 550,
    orientation: "portrait",
    size: "small",
    isSmallScreen: true,
    safeAreaInsets: {
      top: 20,
      left: 0,
      right: 0,
      bottom: 0,
    },
  }

  return {
    ScreenDimensionsContext: {
      Consumer: ({ children }: any) => children(screenDimensions),
    },
    ProvideScreenDimensions: ({ children }: React.PropsWithChildren<{}>) => {
      return React.createElement(React.Fragment, null, children)
    },
    useScreenDimensions: () => screenDimensions,
    useOffscreenStyle: () => ({}),
  }
})

jest.mock("app/NativeModules/NotificationsManager.tsx", () => ({
  NotificationsManager: new (require("events").EventEmitter)(),
}))

jest.mock("app/system/navigation/navigate", () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  dismissModal: jest.fn(),
  popToRoot: jest.fn(),
  navigateToEntity: jest.fn(),
  navigateToPartner: jest.fn(),
  switchTab: jest.fn(),
  navigationEvents: new (require("events").EventEmitter)(),
  EntityType: { partner: "partner", fair: "fair" },
  SlugType: { partner: "partner", fair: "fair" },
}))

jest.mock("app/utils/track/SegmentTrackingProvider", () => ({
  SegmentTrackingProvider: {
    setup: () => null,
    identify: jest.fn(),
    postEvent: () => null,
  },
}))

jest.mock("app/utils/track/providers.tsx", () => ({
  postEventToProviders: jest.fn(),
  _addTrackingProvider: jest.fn(),
}))

jest.mock("@gorhom/bottom-sheet", () => ({
  __esModule: true,
  ...require("@gorhom/bottom-sheet/mock"),
}))

jest.mock("react-native-collapsible-tab-view", () => {
  const getMockCollapsibleTabs =
    require("app/utils/tests/getMockCollapsibleTabView").getMockCollapsibleTabs
  return getMockCollapsibleTabs()
})

jest.mock("@shopify/flash-list", () => {
  const { FlatList } = require("react-native")
  return {
    ...jest.requireActual("@shopify/flash-list"),
    MasonryFlashList: FlatList,
  }
})

jest.mock("@react-native-community/geolocation", () => ({
  addListener: jest.fn(),
  getCurrentPosition: jest.fn(),
  removeListeners: jest.fn(),
  requestAuthorization: jest.fn(),
  setConfiguration: jest.fn(),
  startObserving: jest.fn(),
  setRNConfiguration: jest.fn(),
  stopObserving: jest.fn(),
}))
