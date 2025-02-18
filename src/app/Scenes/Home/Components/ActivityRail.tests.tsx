import { fireEvent, screen } from "@testing-library/react-native"
import { ActivityRailTestQuery } from "__generated__/ActivityRailTestQuery.graphql"
import { ActivityRail } from "app/Scenes/Home/Components/ActivityRail"
import { navigate } from "app/system/navigation/navigate"
import { mockTrackEvent } from "app/utils/tests/globallyMockedStuff"
import { setupTestWrapper } from "app/utils/tests/setupTestWrapper"
import { graphql } from "relay-runtime"

describe("ActivityRail", () => {
  const { renderWithRelay } = setupTestWrapper<ActivityRailTestQuery>({
    Component: ({ viewer }) => {
      return <ActivityRail title="Latest Activity Rail" notificationsConnection={viewer!} />
    },
    query: graphql`
      query ActivityRailTestQuery @relay_test_operation {
        viewer {
          ...ActivityRail_notificationsConnection
        }
      }
    `,
  })

  it("renders", () => {
    renderWithRelay({
      Viewer: () => ({
        notificationsConnection: { edges: [{ node: { internalID: "id-1" } }] },
      }),
    })

    expect(screen.getByText("Latest Activity Rail")).toBeOnTheScreen()
    expect(screen.getByText(/mock-value-for-field-"title"/)).toBeOnTheScreen()
  })

  it("handles header tap", () => {
    renderWithRelay({
      Viewer: () => ({
        notificationsConnection: { edges: [{ node: { internalID: "id-1" } }] },
      }),
    })

    fireEvent.press(screen.getByText("Latest Activity Rail"))

    expect(navigate).toHaveBeenCalledWith("/activity")

    expect(mockTrackEvent).toHaveBeenCalledWith({
      action: "tappedActivityGroup",
      context_module: "activityRail",
      context_screen_owner_id: undefined,
      context_screen_owner_slug: undefined,
      context_screen_owner_type: "home",
      destination_screen_owner_id: undefined,
      destination_screen_owner_slug: undefined,
      destination_screen_owner_type: "activities",
      horizontal_slide_position: undefined,
      module_height: undefined,
      type: "header",
    })
  })

  it("handles See All tap", () => {
    renderWithRelay({
      Viewer: () => ({
        notificationsConnection: { edges: [{ node: { internalID: "id-1" } }] },
      }),
    })

    fireEvent.press(screen.getByText("See All"))

    expect(navigate).toHaveBeenCalledWith("/activity")

    expect(mockTrackEvent).toHaveBeenCalledWith({
      action: "tappedActivityGroup",
      context_module: "activityRail",
      context_screen_owner_id: undefined,
      context_screen_owner_slug: undefined,
      context_screen_owner_type: "home",
      destination_screen_owner_id: undefined,
      destination_screen_owner_slug: undefined,
      destination_screen_owner_type: "activities",
      horizontal_slide_position: undefined,
      module_height: undefined,
      type: "viewAll",
    })
  })

  it("handles item tap", () => {
    renderWithRelay({
      Viewer: () => ({
        notificationsConnection: { edges: [{ node: { internalID: "id-1" } }] },
      }),
    })

    fireEvent.press(screen.getByText(/mock-value-for-field-"title"/))

    expect(navigate).toHaveBeenCalledWith('<mock-value-for-field-"targetHref">', {
      passProps: {
        predefinedFilters: [
          { displayText: "Recently Added", paramName: "sort", paramValue: "-published_at" },
        ],
        searchCriteriaID: undefined,
      },
    })

    expect(mockTrackEvent).toHaveBeenCalledWith({
      action: "tappedActivityGroup",
      context_module: "activityRail",
      context_screen_owner_type: "home",
      destination_screen_owner_type: "vanityurlentity",
      horizontal_slide_position: 0,
      module_height: "single",
      type: "thumbnail",
    })
  })

  describe("when there are no notifications", () => {
    it("does not render", () => {
      renderWithRelay({
        Viewer: () => ({
          notificationsConnection: { edges: [] },
        }),
      })

      expect(screen.queryByText("Latest Activity Rail")).not.toBeOnTheScreen()
    })
  })
})
