import {
  Flex,
  Join,
  Screen,
  Separator,
  ShareIcon,
  Skeleton,
  SkeletonBox,
  SkeletonText,
  Spacer,
  Tabs,
} from "@artsy/palette-mobile"
import {
  ArtistAboveTheFoldQuery,
  FilterArtworksInput,
} from "__generated__/ArtistAboveTheFoldQuery.graphql"
import { ArtistBelowTheFoldQuery } from "__generated__/ArtistBelowTheFoldQuery.graphql"
import { ArtistAboutContainer } from "app/Components/Artist/ArtistAbout/ArtistAbout"
import ArtistArtworks from "app/Components/Artist/ArtistArtworks/ArtistArtworks"
import {
  ArtistHeaderFragmentContainer,
  useArtistHeaderImageDimensions,
} from "app/Components/Artist/ArtistHeader"
import { ArtistHeaderNavRight } from "app/Components/Artist/ArtistHeaderNavRight"
import { ArtistInsightsFragmentContainer } from "app/Components/Artist/ArtistInsights/ArtistInsights"
import {
  FilterArray,
  filterArtworksParams,
  getFilterArrayFromQueryParams,
  prepareFilterArtworksParamsForInput,
} from "app/Components/ArtworkFilter/ArtworkFilterHelpers"
import { ArtworkFiltersStoreProvider } from "app/Components/ArtworkFilter/ArtworkFilterStore"
import { DEFAULT_ARTWORK_SORT } from "app/Components/ArtworkFilter/Filters/SortOptions"
import { getOnlyFilledSearchCriteriaValues } from "app/Components/ArtworkFilter/SavedSearch/searchCriteriaHelpers"
import { SearchCriteriaAttributes } from "app/Components/ArtworkFilter/SavedSearch/types"
import { PlaceholderGrid } from "app/Components/ArtworkGrids/GenericGrid"
import { usePopoverMessage } from "app/Components/PopoverMessage/popoverMessageHooks"
import { useShareSheet } from "app/Components/ShareSheet/ShareSheetContext"
import { SearchCriteriaQueryRenderer } from "app/Scenes/Artist/SearchCriteria"
import { goBack } from "app/system/navigation/navigate"
import { getRelayEnvironment } from "app/system/relay/defaultEnvironment"
import { AboveTheFoldQueryRenderer } from "app/utils/AboveTheFoldQueryRenderer"
import { ProvideScreenTracking, Schema } from "app/utils/track"
import React, { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, View } from "react-native"
import { graphql } from "react-relay"
import RelayModernEnvironment from "relay-runtime/lib/store/RelayModernEnvironment"

const INITIAL_TAB = "Artworks"

interface ArtistProps {
  artistAboveTheFold: NonNullable<ArtistAboveTheFoldQuery["response"]["artist"]>
  artistBelowTheFold?: ArtistBelowTheFoldQuery["response"]["artist"]
  auctionResultsInitialFilters?: FilterArray
  environment?: RelayModernEnvironment
  fetchCriteriaError: Error | null
  initialTab?: string
  me: ArtistAboveTheFoldQuery["response"]["me"]
  predefinedFilters?: FilterArray
  scrollToArtworksGrid: boolean
  searchCriteria: SearchCriteriaAttributes | null
}

export const Artist: React.FC<ArtistProps> = (props) => {
  const {
    artistAboveTheFold,
    artistBelowTheFold,
    auctionResultsInitialFilters,
    fetchCriteriaError,
    initialTab = INITIAL_TAB,
    me,
    predefinedFilters,
    scrollToArtworksGrid,
    searchCriteria,
  } = props

  const [headerHeight, setHeaderHeight] = useState(0)
  const popoverMessage = usePopoverMessage()
  const { showShareSheet } = useShareSheet()

  useEffect(() => {
    if (!!fetchCriteriaError) {
      popoverMessage.show({
        title: "Sorry, an error occured",
        message: "Failed to get saved search criteria",
        placement: "top",
        type: "error",
      })
    }
  }, [fetchCriteriaError])

  const handleSharePress = () => {
    showShareSheet({
      type: "artist",
      internalID: artistAboveTheFold.internalID,
      slug: artistAboveTheFold.slug,
      artists: [{ name: artistAboveTheFold.name }],
      title: artistAboveTheFold.name!,
      href: artistAboveTheFold.href!,
      currentImageUrl: artistAboveTheFold.image?.url ?? undefined,
    })
  }

  const renderBelowTheHeaderComponent = useCallback(
    () => (
      <ArtistHeaderFragmentContainer
        artist={artistAboveTheFold!}
        me={me!}
        onLayoutChange={({ nativeEvent }) => {
          if (headerHeight !== nativeEvent.layout.height) {
            setHeaderHeight(nativeEvent.layout.height)
          }
        }}
      />
    ),
    [artistAboveTheFold, headerHeight]
  )

  return (
    <ProvideScreenTracking
      info={{
        context_screen: Schema.PageNames.ArtistPage,
        context_screen_owner_type: Schema.OwnerEntityTypes.Artist,
        context_screen_owner_slug: artistAboveTheFold.slug,
        context_screen_owner_id: artistAboveTheFold.internalID,
      }}
    >
      <ArtworkFiltersStoreProvider>
        <Tabs.TabsWithHeader
          initialTabName={initialTab}
          title={artistAboveTheFold.name!}
          showLargeHeaderText={false}
          headerProps={{
            rightElements: (
              <ArtistHeaderNavRight artist={artistAboveTheFold} onSharePress={handleSharePress} />
            ),
            onBack: goBack,
          }}
          BelowTitleHeaderComponent={renderBelowTheHeaderComponent}
        >
          <Tabs.Tab name="Artworks" label="Artworks">
            <Tabs.Lazy>
              <ArtistArtworks
                artist={artistAboveTheFold}
                searchCriteria={searchCriteria}
                predefinedFilters={predefinedFilters}
                scrollToArtworksGrid={scrollToArtworksGrid}
              />
            </Tabs.Lazy>
          </Tabs.Tab>

          <Tabs.Tab name="Insights" label="Auction Results">
            <Tabs.Lazy>
              {artistBelowTheFold ? (
                <ArtistInsightsFragmentContainer
                  artist={artistBelowTheFold}
                  initialFilters={auctionResultsInitialFilters}
                />
              ) : (
                <LoadingPage />
              )}
            </Tabs.Lazy>
          </Tabs.Tab>

          <Tabs.Tab name="Overview" label="About">
            <Tabs.Lazy>
              {artistBelowTheFold ? (
                <ArtistAboutContainer artist={artistBelowTheFold} />
              ) : (
                <LoadingPage />
              )}
            </Tabs.Lazy>
          </Tabs.Tab>
        </Tabs.TabsWithHeader>
      </ArtworkFiltersStoreProvider>
    </ProvideScreenTracking>
  )
}

interface ArtistQueryRendererProps {
  artistID: string
  categories?: string[]
  environment?: RelayModernEnvironment
  initialTab?: string
  predefinedFilters?: FilterArray
  scrollToArtworksGrid?: boolean
  search_criteria_id?: string
  searchCriteriaID?: string
  sizes?: string[]
}

export const ArtistScreenQuery = graphql`
  query ArtistAboveTheFoldQuery($artistID: String!, $input: FilterArtworksInput) {
    artist(id: $artistID) @principalField {
      ...ArtistHeader_artist
      ...ArtistArtworks_artist @arguments(input: $input)
      ...ArtistHeaderNavRight_artist
      id
      internalID
      slug
      href
      name
      image {
        url(version: "large")
      }
    }
    me {
      ...ArtistHeader_me @arguments(artistID: $artistID)
    }
  }
`

export const defaultArtistVariables = () => ({
  input: {
    sort: DEFAULT_ARTWORK_SORT.paramValue,
  },
})

export const ArtistQueryRenderer: React.FC<ArtistQueryRendererProps> = (props) => {
  const {
    artistID,
    categories,
    environment,
    initialTab,
    predefinedFilters,
    search_criteria_id,
    scrollToArtworksGrid = false,
    searchCriteriaID,
    sizes,
  } = props

  return (
    <SearchCriteriaQueryRenderer
      searchCriteriaId={searchCriteriaID ?? search_criteria_id}
      environment={environment}
      render={{
        renderPlaceholder: () => <ArtistSkeleton />,
        renderComponent: (searchCriteriaProps) => {
          const { savedSearchCriteria, fetchCriteriaError } = searchCriteriaProps
          const predefinedFilterParams = filterArtworksParams(predefinedFilters ?? [], "artwork")
          let initialArtworksInput = {
            ...defaultArtistVariables().input,
            ...predefinedFilterParams,
          }

          if (savedSearchCriteria) {
            const preparedCriteria = getOnlyFilledSearchCriteriaValues(savedSearchCriteria)

            initialArtworksInput = {
              ...initialArtworksInput,
              ...preparedCriteria,
              sort: "-published_at",
            }
          }
          const input = prepareFilterArtworksParamsForInput(initialArtworksInput)

          return (
            <AboveTheFoldQueryRenderer<ArtistAboveTheFoldQuery, ArtistBelowTheFoldQuery>
              environment={environment || getRelayEnvironment()}
              above={{
                query: ArtistScreenQuery,
                variables: {
                  artistID,
                  input: input as FilterArtworksInput,
                },
              }}
              below={{
                query: graphql`
                  query ArtistBelowTheFoldQuery($artistID: String!) {
                    artist(id: $artistID) {
                      ...ArtistAbout_artist
                      ...ArtistInsights_artist
                    }
                  }
                `,
                variables: { artistID },
              }}
              render={{
                renderPlaceholder: () => <ArtistSkeleton />,
                renderComponent: ({ above, below }) => {
                  // return <ArtistSkeleton />
                  if (!above.artist) {
                    throw new Error("no artist data")
                  }
                  return (
                    <Artist
                      artistAboveTheFold={above.artist}
                      artistBelowTheFold={below?.artist}
                      me={above.me}
                      initialTab={initialTab}
                      searchCriteria={savedSearchCriteria}
                      fetchCriteriaError={fetchCriteriaError}
                      predefinedFilters={predefinedFilters}
                      auctionResultsInitialFilters={getFilterArrayFromQueryParams({
                        categories: categories ?? [],
                        sizes: sizes ?? [],
                      })}
                      scrollToArtworksGrid={scrollToArtworksGrid}
                    />
                  )
                },
              }}
            />
          )
        },
      }}
    />
  )
}

/**
 * Be lazy and just have a simple loading spinner for the below-the-fold tabs
 * (as opposed to nice fancy placeholder screens) since people are really
 * unlikely to tap into them quick enough to see the loading state
 * @param param0
 */
const LoadingPage: React.FC<{}> = ({}) => {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
      <ActivityIndicator />
    </View>
  )
}

const ArtistSkeleton: React.FC = () => {
  const { height, width } = useArtistHeaderImageDimensions()

  return (
    <Screen>
      <Screen.Header rightElements={<ShareIcon width={23} height={23} />} />
      <Screen.Body fullwidth>
        <Skeleton>
          <Flex px={2}>
            <SkeletonBox width={width} height={height} />
            <Spacer y={2} />
            <Join separator={<Spacer y={0.5} />}>
              <SkeletonText variant="lg">Artist Name Artist Name</SkeletonText>
              <SkeletonText variant="lg">American, b. 1945</SkeletonText>
            </Join>
          </Flex>

          <Spacer y={4} />

          {/* Tabs */}
          <Flex justifyContent="space-around" flexDirection="row" px={2}>
            <SkeletonText variant="xs">Artworks</SkeletonText>
            <SkeletonText variant="xs">Auction Results</SkeletonText>
            <SkeletonText variant="xs">About</SkeletonText>
          </Flex>
        </Skeleton>

        <Separator mt={1} mb={4} />

        <PlaceholderGrid />
      </Screen.Body>
    </Screen>
  )
}
