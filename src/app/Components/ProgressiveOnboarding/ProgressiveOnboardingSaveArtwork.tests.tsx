import { fireEvent, screen, act } from "@testing-library/react-native"
import { __globalStoreTestUtils__ } from "app/store/GlobalStore"
import { setupTestWrapper } from "app/utils/tests/setupTestWrapper"
import { useEffect } from "react"
import { Text, View } from "react-native"
import { graphql } from "react-relay"
import { ProgressiveOnboardingSaveArtwork } from "./ProgressiveOnboardingSaveArtwork"

jest.mock("app/utils/ElementInView", () => ({
  ElementInView: (props: any) => <MockedVisibleSentinel {...props} />,
}))

jest.mock("@artsy/palette-mobile", () => ({
  ...jest.requireActual("@artsy/palette-mobile"),
  Popover: (props: any) => <MockedPopover {...props} />,
}))

describe("ProgressiveOnboardingSaveArtwork", () => {
  const { renderWithRelay } = setupTestWrapper({
    Component: () => (
      <ProgressiveOnboardingSaveArtwork>
        <Text>Test Children</Text>
      </ProgressiveOnboardingSaveArtwork>
    ),
    query: graphql`
      query ProgressiveOnboardingSaveArtworkTestsQuery @relay_test_operation {
        me {
          counts {
            savedArtworks
          }
        }
      }
    `,
  })

  it("renders", () => {
    renderWithRelay({ MeCounts: () => ({ savedArtworks: 1 }) })

    expect(screen.getByText("Test Children")).toBeOnTheScreen()
    expect(screen.queryByText("Popover")).not.toBeOnTheScreen()
  })

  it("dismisses the save-artwork popover from store", () => {
    renderWithRelay({ MeCounts: () => ({ savedArtworks: 0 }) })

    expect(screen.getByText("Test Children")).toBeOnTheScreen()

    expect(screen.getByText("Popover")).toBeOnTheScreen()

    act(() => {
      fireEvent.press(screen.getByText("Popover"))
    })

    expect(__globalStoreTestUtils__?.getLastAction().type).toContain(
      "progressiveOnboarding.dismiss"
    )
  })
})

const MockedVisibleSentinel: React.FC<any> = ({ children, onVisible }) => {
  useEffect(() => onVisible(), [])

  return <View>{children}</View>
}

const MockedPopover: React.FC<any> = ({ children, onDismiss }) => {
  return (
    <>
      <Text onPress={onDismiss}>Popover</Text>
      {children}
    </>
  )
}
