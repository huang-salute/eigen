import { screen } from "@testing-library/react-native"
import { ArtistAboutTestsQuery } from "__generated__/ArtistAboutTestsQuery.graphql"
import { Biography } from "app/Components/Artist/Biography"
import { ModalStack } from "app/system/navigation/ModalStack"
import { setupTestWrapper } from "app/utils/tests/setupTestWrapper"
import { graphql } from "react-relay"
import { ArtistAboutContainer } from "./ArtistAbout"
import { ArtistAboutShowsFragmentContainer } from "./ArtistAboutShows"

describe("ArtistAbout", () => {
  const { renderWithRelay } = setupTestWrapper<ArtistAboutTestsQuery>({
    Component: ({ artist }) => (
      <ModalStack>
        <ArtistAboutContainer artist={artist!} />
      </ModalStack>
    ),
    query: graphql`
      query ArtistAboutTestsQuery($artistID: String!) @relay_test_operation {
        artist(id: $artistID) {
          ...ArtistAbout_artist
        }
      }
    `,
    variables: { artistID: "artist-id" },
  })

  describe("Biography", () => {
    it("is shown when the artist has metadata", () => {
      renderWithRelay({
        ArtistBlurb: () => {
          return {
            text: "a biography",
          }
        },
      })

      expect(screen.UNSAFE_queryAllByType(Biography)).toHaveLength(1)
    })

    it("is hidden when the artist has metadata", () => {
      renderWithRelay({
        ArtistBlurb: () => {
          return {
            text: "",
          }
        },
      })

      expect(screen.UNSAFE_queryAllByType(Biography)).toHaveLength(0)
    })
  })

  describe("ArtistAboutShows", () => {
    it("is rendered by default", () => {
      renderWithRelay()

      expect(screen.UNSAFE_queryByType(ArtistAboutShowsFragmentContainer)).toBeTruthy()
    })
  })

  describe("ArtistAboutEditorial", () => {
    it("renders editorial section", () => {
      renderWithRelay({
        Artist: () => ({ name: "Andy Warhol" }),
      })

      expect(screen.getByText("Artsy Editorial Featuring Andy Warhol")).toBeOnTheScreen()
    })

    it("does not render when there are no articles", () => {
      renderWithRelay({
        ArticleConnection: () => ({ edges: null }),
      })

      expect(screen.queryByText(/Artsy Editorial Featuring/)).not.toBeOnTheScreen()
    })
  })
})
