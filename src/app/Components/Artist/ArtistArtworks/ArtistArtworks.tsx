import { ActionType, ContextModule, OwnerType } from "@artsy/cohesion"
import {
  BellIcon,
  Box,
  Button,
  Flex,
  Message,
  Spacer,
  Spinner,
  Tabs,
  Text,
  useScreenDimensions,
  useSpace,
} from "@artsy/palette-mobile"
import { MasonryFlashListRef } from "@shopify/flash-list"
import { ArtistArtworks_artist$data } from "__generated__/ArtistArtworks_artist.graphql"
import { ArtistArtworksFilterHeader } from "app/Components/Artist/ArtistArtworks/ArtistArtworksFilterHeader"
import { CreateSavedSearchModal } from "app/Components/Artist/ArtistArtworks/CreateSavedSearchModal"
import { useCreateSavedSearchModalFilters } from "app/Components/Artist/ArtistArtworks/hooks/useCreateSavedSearchModalFilters"
import { useShowArtworksFilterModal } from "app/Components/Artist/ArtistArtworks/hooks/useShowArtworksFilterModal"
import { ArtworkFilterNavigator, FilterModalMode } from "app/Components/ArtworkFilter"
import { Aggregations, FilterArray } from "app/Components/ArtworkFilter/ArtworkFilterHelpers"
import { ArtworksFiltersStore } from "app/Components/ArtworkFilter/ArtworkFilterStore"
import { ORDERED_ARTWORK_SORTS } from "app/Components/ArtworkFilter/Filters/SortOptions"
import { convertSavedSearchCriteriaToFilterParams } from "app/Components/ArtworkFilter/SavedSearch/convertersToFilterParams"
import { SearchCriteriaAttributes } from "app/Components/ArtworkFilter/SavedSearch/types"
import { useArtworkFilters } from "app/Components/ArtworkFilter/useArtworkFilters"
import ArtworkGridItem from "app/Components/ArtworkGrids/ArtworkGridItem"
import { FilteredArtworkGridZeroState } from "app/Components/ArtworkGrids/FilteredArtworkGridZeroState"
import { Props as InfiniteScrollGridProps } from "app/Components/ArtworkGrids/InfiniteScrollArtworksGrid"
import { useNavigateToPageableRoute } from "app/system/navigation/useNavigateToPageableRoute"
import { extractNodes } from "app/utils/extractNodes"
import { useFeatureFlag } from "app/utils/hooks/useFeatureFlag"
import {
  ESTIMATED_MASONRY_ITEM_SIZE,
  NUM_COLUMNS_MASONRY,
  ON_END_REACHED_THRESHOLD_MASONRY,
} from "app/utils/masonryHelpers"
import { Schema } from "app/utils/track"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RelayPaginationProp, createPaginationContainer, graphql } from "react-relay"
import { useTracking } from "react-tracking"

interface ArtworksGridProps extends InfiniteScrollGridProps {
  artist: ArtistArtworks_artist$data
  searchCriteria: SearchCriteriaAttributes | null
  relay: RelayPaginationProp
  predefinedFilters?: FilterArray
  scrollToArtworksGrid: boolean
}

const ArtworksGrid: React.FC<ArtworksGridProps> = ({
  artist,
  relay,
  predefinedFilters,
  scrollToArtworksGrid,
  searchCriteria,
  ...props
}) => {
  const [isCreateAlertModalVisible, setIsCreateAlertModalVisible] = useState(false)

  const { showFilterArtworksModal, openFilterArtworksModal, closeFilterArtworksModal } =
    useShowArtworksFilterModal({ artist })
  const tracking = useTracking()
  const space = useSpace()
  const { width } = useScreenDimensions()
  const showCreateAlertAtEndOfList = useFeatureFlag("ARShowCreateAlertInArtistArtworksListFooter")
  const enableAlertsFilters = useFeatureFlag("AREnableAlertsFilters")
  const artworks = useMemo(() => extractNodes(artist.artworks), [artist.artworks])

  const gridRef = useRef<MasonryFlashListRef<typeof artworks[0]>>(null)

  const appliedFilters = ArtworksFiltersStore.useStoreState((state) => state.appliedFilters)

  const { navigateToPageableRoute } = useNavigateToPageableRoute({ items: artworks })

  useArtworkFilters({
    relay,
    aggregations: artist.aggregations?.aggregations,
    componentPath: "ArtistArtworks/ArtistArtworks",
  })

  const setInitialFilterStateAction = ArtworksFiltersStore.useStoreActions(
    (state) => state.setInitialFilterStateAction
  )

  useEffect(() => {
    let filters: FilterArray = []

    if (Array.isArray(predefinedFilters)) {
      filters = predefinedFilters
    }

    if (searchCriteria && artist.aggregations?.aggregations) {
      const params = convertSavedSearchCriteriaToFilterParams(
        searchCriteria,
        artist.aggregations.aggregations as Aggregations
      )
      const sortFilterItem = ORDERED_ARTWORK_SORTS.find(
        (sortEntity) => sortEntity.paramValue === "-published_at"
      )!

      filters = [...params, sortFilterItem]
    }

    setInitialFilterStateAction(filters)
  }, [])

  useEffect(() => {
    if (scrollToArtworksGrid) {
      setTimeout(() => {
        gridRef.current?.scrollToOffset({ offset: 0, animated: true })
      }, 1000)
    }
  })
  const { savedSearchEntity, attributes } = useCreateSavedSearchModalFilters({
    entityId: artist.internalID!,
    entityName: artist.name ?? "",
    entitySlug: artist.slug!,
    entityOwnerType: OwnerType.artist,
  })

  const trackClear = (id: string, slug: string) => {
    tracking.trackEvent({
      action_name: "clearFilters",
      context_screen: Schema.ContextModules.ArtworkGrid,
      context_screen_owner_type: Schema.OwnerEntityTypes.Artist,
      context_screen_owner_id: id,
      context_screen_owner_slug: slug,
      action_type: Schema.ActionTypes.Tap,
    })
  }

  const handleCompleteSavedSearch = () => {
    // TODO: Get the new count of the artist saved alerts
  }

  const shouldDisplaySpinner = !!artworks.length && !!relay.isLoading() && !!relay.hasMore()

  const loadMore = useCallback(() => {
    if (relay.hasMore() && !relay.isLoading()) {
      relay.loadMore(10)
    }
  }, [relay.hasMore(), relay.isLoading()])

  const CreateAlertButton = () => {
    return (
      <Button
        variant="outline"
        mx="auto"
        icon={<BellIcon />}
        size="small"
        onPress={() => {
          // Could be useful to differenciate between the two at a later point
          tracking.trackEvent(
            tracks.tappedCreateAlert({ artistId: artist.internalID, artistSlug: artist.slug })
          )

          if (enableAlertsFilters) {
            setIsCreateAlertModalVisible(true)
          } else {
            openFilterArtworksModal("createAlert")
          }
        }}
      >
        Create Alert
      </Button>
    )
  }

  if (!artist.statuses?.artworks) {
    return (
      <Tabs.ScrollView>
        <Spacer y={6} />

        <Text variant="md" textAlign="center">
          Get notified when new works are available
        </Text>

        <Text variant="md" textAlign="center" color="black60">
          There are currently no works for sale for this artist. Create an alert, and we’ll let you
          know when new works are added.
        </Text>

        <Spacer y={2} />

        <CreateAlertButton />

        <Spacer y={6} />

        <ArtworkFilterNavigator
          {...props}
          id={artist.internalID}
          slug={artist.slug}
          visible={showFilterArtworksModal}
          name={artist.name ?? ""}
          exitModal={closeFilterArtworksModal}
          closeModal={closeFilterArtworksModal}
          mode={FilterModalMode.ArtistArtworks}
          shouldShowCreateAlertButton
        />

        {!!enableAlertsFilters && (
          <CreateSavedSearchModal
            aggregations={(artist.aggregations?.aggregations as Aggregations) || []}
            attributes={attributes}
            closeModal={() => setIsCreateAlertModalVisible(false)}
            entity={savedSearchEntity}
            onComplete={handleCompleteSavedSearch}
            visible={isCreateAlertModalVisible}
          />
        )}
      </Tabs.ScrollView>
    )
  }

  const ListFooterComponenet = () => {
    if (shouldDisplaySpinner) {
      return (
        <Flex my={4} flexDirection="row" justifyContent="center">
          <Spinner />
        </Flex>
      )
    }

    if (showCreateAlertAtEndOfList && !relay.hasMore()) {
      return (
        <Message
          title="Get notified when new works are added."
          containerStyle={{ my: 2 }}
          IconComponent={() => {
            return <CreateAlertButton />
          }}
          iconPosition="right"
        />
      )
    }
    return null
  }

  return (
    <>
      <Tabs.Masonry
        data={artworks}
        numColumns={NUM_COLUMNS_MASONRY}
        estimatedItemSize={ESTIMATED_MASONRY_ITEM_SIZE}
        keyboardShouldPersistTaps="handled"
        innerRef={gridRef}
        ListEmptyComponent={
          <Box mb="80px" pt={2}>
            <FilteredArtworkGridZeroState
              id={artist.id}
              slug={artist.slug}
              trackClear={trackClear}
              hideClearButton={!appliedFilters.length}
            />
          </Box>
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item, index, columnIndex }) => {
          const imgAspectRatio = item.image?.aspectRatio ?? 1
          const imgWidth = width / NUM_COLUMNS_MASONRY - space(2) - space(1)
          const imgHeight = imgWidth / imgAspectRatio

          return (
            <Flex
              pl={columnIndex === 0 ? 0 : 1}
              pr={NUM_COLUMNS_MASONRY - (columnIndex + 1) === 0 ? 0 : 1}
              mt={2}
            >
              <ArtworkGridItem
                {...props}
                itemIndex={index}
                contextScreenOwnerType={OwnerType.artist}
                contextScreenOwnerId={artist.internalID}
                contextScreenOwnerSlug={artist.slug}
                artwork={item}
                height={imgHeight}
                navigateToPageableRoute={navigateToPageableRoute}
              />
            </Flex>
          )
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={ON_END_REACHED_THRESHOLD_MASONRY}
        // need to pass zIndex: 1 here in order for the SubTabBar to
        // be visible above list content
        ListHeaderComponentStyle={{ zIndex: 1 }}
        ListHeaderComponent={
          <Tabs.SubTabBar>
            <ArtistArtworksFilterHeader
              artist={artist}
              showCreateAlertModal={() => setIsCreateAlertModalVisible(true)}
            />
          </Tabs.SubTabBar>
        }
        ListFooterComponent={<ListFooterComponenet />}
      />
      <ArtworkFilterNavigator
        {...props}
        id={artist.internalID}
        slug={artist.slug}
        visible={!!showFilterArtworksModal}
        name={artist.name ?? ""}
        exitModal={closeFilterArtworksModal}
        closeModal={closeFilterArtworksModal}
        mode={FilterModalMode.ArtistArtworks}
        shouldShowCreateAlertButton
      />
      {!!enableAlertsFilters && (
        <CreateSavedSearchModal
          aggregations={(artist.aggregations?.aggregations as Aggregations) || []}
          attributes={attributes}
          closeModal={() => setIsCreateAlertModalVisible(false)}
          entity={savedSearchEntity}
          onComplete={handleCompleteSavedSearch}
          visible={isCreateAlertModalVisible}
        />
      )}
    </>
  )
}

export default createPaginationContainer(
  ArtworksGrid,
  {
    artist: graphql`
      fragment ArtistArtworks_artist on Artist
      @argumentDefinitions(
        count: { type: "Int", defaultValue: 10 }
        cursor: { type: "String" }
        input: { type: "FilterArtworksInput" }
      ) {
        ...ArtistArtworksFilterHeader_artist
        id
        slug
        name
        internalID
        aggregations: filterArtworksConnection(
          first: 0
          aggregations: [
            COLOR
            DIMENSION_RANGE
            LOCATION_CITY
            MAJOR_PERIOD
            MATERIALS_TERMS
            MEDIUM
            PARTNER
            PRICE_RANGE
            SIMPLE_PRICE_HISTOGRAM
          ]
        ) {
          aggregations {
            slice
            counts {
              count
              name
              value
            }
          }
        }
        artworks: filterArtworksConnection(first: $count, after: $cursor, input: $input)
          @connection(key: "ArtistArtworksGrid_artworks") {
          edges {
            node {
              id
              slug
              image(includeAll: false) {
                aspectRatio
              }
              ...ArtworkGridItem_artwork @arguments(includeAllImages: false)
            }
          }
        }
        statuses {
          artworks
        }
      }
    `,
  },
  {
    getConnectionFromProps(props) {
      return props.artist && props.artist.artworks
    },
    getVariables(props, { count, cursor }, fragmentVariables) {
      return {
        id: props.artist.id,
        input: fragmentVariables.input,
        count,
        cursor,
      }
    },
    query: graphql`
      query ArtistArtworksQuery(
        $id: ID!
        $count: Int!
        $cursor: String
        $input: FilterArtworksInput
      ) {
        node(id: $id) {
          ... on Artist {
            ...ArtistArtworks_artist @arguments(count: $count, cursor: $cursor, input: $input)
          }
        }
      }
    `,
  }
)

const tracks = {
  tappedCreateAlert: ({ artistId, artistSlug }: { artistId: string; artistSlug: string }) => ({
    action: ActionType.tappedCreateAlert,
    context_screen_owner_type: OwnerType.artist,
    context_screen_owner_id: artistId,
    context_screen_owner_slug: artistSlug,
    context_module: ContextModule.artistArtworksGridEnd,
  }),
}
