import { OwnerType } from "@artsy/cohesion"
import { Box, SpacingUnit, useSpace, Separator } from "@artsy/palette-mobile"
import { ArtworkAboveTheFoldQuery } from "__generated__/ArtworkAboveTheFoldQuery.graphql"
import { ArtworkBelowTheFoldQuery } from "__generated__/ArtworkBelowTheFoldQuery.graphql"
import { ArtworkMarkAsRecentlyViewedQuery } from "__generated__/ArtworkMarkAsRecentlyViewedQuery.graphql"
import { Artwork_artworkAboveTheFold$data } from "__generated__/Artwork_artworkAboveTheFold.graphql"
import { Artwork_artworkBelowTheFold$data } from "__generated__/Artwork_artworkBelowTheFold.graphql"
import { Artwork_me$data } from "__generated__/Artwork_me.graphql"
import { ArtworkListsProvider } from "app/Components/ArtworkLists/ArtworkListsContext"
import { AuctionTimerState, currentTimerState } from "app/Components/Bidding/Components/Timer"
import { usePageableScreensContext } from "app/Components/PageableScreensView/PageableScreensContext"
import { PageableScreensView } from "app/Components/PageableScreensView/PageableScreensView"
import { ArtistSeriesMoreSeriesFragmentContainer as ArtistSeriesMoreSeries } from "app/Scenes/ArtistSeries/ArtistSeriesMoreSeries"
import { ArtworkAuctionCreateAlertHeader } from "app/Scenes/Artwork/ArtworkAuctionCreateAlertHeader"
import { ArtworkScreenHeader } from "app/Scenes/Artwork/Components/ArtworkScreenHeader"
import { OfferSubmittedModal } from "app/Scenes/Inbox/Components/Conversations/OfferSubmittedModal"
import { GlobalStore } from "app/store/GlobalStore"
import { AnalyticsContextProvider } from "app/system/analytics/AnalyticsContext"
import { navigationEvents } from "app/system/navigation/navigate"
import { getRelayEnvironment } from "app/system/relay/defaultEnvironment"
import { AboveTheFoldQueryRenderer } from "app/utils/AboveTheFoldQueryRenderer"
import { QAInfoPanel } from "app/utils/QAInfo"
import {
  AuctionWebsocketChannelInfo,
  AuctionWebsocketContextProvider,
} from "app/utils/Websockets/auctions/AuctionSocketContext"
import { useFeatureFlag } from "app/utils/hooks/useFeatureFlag"
import { ProvidePlaceholderContext } from "app/utils/placeholders"
import { ProvideScreenTracking, Schema } from "app/utils/track"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { FlatList, RefreshControl } from "react-native"
import { commitMutation, createRefetchContainer, graphql, RelayRefetchProp } from "react-relay"
import { TrackingProp } from "react-tracking"
import usePrevious from "react-use/lib/usePrevious"
import RelayModernEnvironment from "relay-runtime/lib/store/RelayModernEnvironment"
import { RelayMockEnvironment } from "relay-test-utils/lib/RelayModernMockEnvironment"
import { ArtworkStore, ArtworkStoreProvider, artworkModel } from "./ArtworkStore"
import { AboutArtistFragmentContainer as AboutArtist } from "./Components/AboutArtist"
import { AboutWorkFragmentContainer as AboutWork } from "./Components/AboutWork"
import { AboveTheFoldPlaceholder } from "./Components/AboveTheFoldArtworkPlaceholder"
import { ArtsyGuarantee } from "./Components/ArtsyGuarantee"
import { ArtworkConsignments } from "./Components/ArtworkConsignments"
import { ArtworkDetails } from "./Components/ArtworkDetails"
import { ArtworkEditionSetInformationFragmentContainer as ArtworkEditionSetInformation } from "./Components/ArtworkEditionSetInformation"
import { ArtworkHeaderFragmentContainer as ArtworkHeader } from "./Components/ArtworkHeader"
import { ArtworkHistoryFragmentContainer as ArtworkHistory } from "./Components/ArtworkHistory"
import { ArtworkLotDetails } from "./Components/ArtworkLotDetails/ArtworkLotDetails"
import { ArtworkStickyBottomContent } from "./Components/ArtworkStickyBottomContent"
import { ArtworksInSeriesRail } from "./Components/ArtworksInSeriesRail"
import { BelowTheFoldPlaceholder } from "./Components/BelowTheFoldPlaceholder"
import { ContextCardFragmentContainer as ContextCard } from "./Components/ContextCard"
import {
  OtherWorksFragmentContainer as OtherWorks,
  populatedGrids,
} from "./Components/OtherWorks/OtherWorks"
import { PartnerCardFragmentContainer as PartnerCard } from "./Components/PartnerCard"
import { ShippingAndTaxesFragmentContainer } from "./Components/ShippingAndTaxes"

interface ArtworkProps {
  artworkAboveTheFold: Artwork_artworkAboveTheFold$data | null
  artworkBelowTheFold: Artwork_artworkBelowTheFold$data | null
  me: Artwork_me$data | null
  isVisible: boolean
  onLoad: (artworkProps: ArtworkProps) => void
  relay: RelayRefetchProp
  tracking?: TrackingProp
}

export const Artwork: React.FC<ArtworkProps> = (props) => {
  const { artworkAboveTheFold, artworkBelowTheFold, isVisible, me, onLoad, relay } = props
  const space = useSpace()
  const [refreshing, setRefreshing] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const isDeepZoomModalVisible = GlobalStore.useAppState(
    (store) => store.devicePrefs.sessionState.isDeepZoomModalVisible
  )

  const { internalID, slug, isInAuction } = artworkAboveTheFold || {}
  const { contextGrids, artistSeriesConnection, artist, context } = artworkBelowTheFold || {}
  const auctionTimerState = ArtworkStore.useStoreState((state) => state.auctionState)

  const enableAuctionHeaderAlertCTA = useFeatureFlag("AREnableAuctionHeaderAlertCTA")

  const shouldRenderPartner = () => {
    const { sale, partner } = artworkBelowTheFold ?? {}

    if (sale?.isBenefit || sale?.isGalleryAuction) {
      return false
    } else if (partner?.type && partner.type !== "Auction House") {
      return true
    } else {
      return false
    }
  }

  const shouldRenderOtherWorks = () => {
    const gridsToShow = populatedGrids(contextGrids)

    if (gridsToShow && gridsToShow.length > 0) {
      return true
    } else {
      return false
    }
  }

  const shouldRenderArtworksInArtistSeries = () => {
    const artistSeries = artistSeriesConnection?.edges?.[0]
    const numArtistSeriesArtworks = artistSeries?.node?.filterArtworksConnection?.edges?.length ?? 0
    return numArtistSeriesArtworks > 0
  }

  const shouldRenderArtistSeriesMoreSeries = () => {
    return (artist?.artistSeriesConnection?.totalCount ?? 0) > 0
  }

  const shouldRenderConsignmentsSection = () => {
    const { isAcquireable, isOfferable } = artworkAboveTheFold ?? {}
    const { isForSale, sale } = artworkBelowTheFold ?? {}
    const artists = artworkBelowTheFold?.artists ?? []
    const consignableArtists = artists.filter((currentArtist) => !!currentArtist?.isConsignable)
    const isBiddableInAuction =
      isInAuction && sale && auctionTimerState !== AuctionTimerState.CLOSED && isForSale

    return consignableArtists.length || isAcquireable || isOfferable || isBiddableInAuction
  }

  useEffect(() => {
    markArtworkAsRecentlyViewed()
    navigationEvents.addListener("modalDismissed", handleModalDismissed)

    return () => {
      navigationEvents.removeListener("modalDismissed", handleModalDismissed)
    }
  }, [])

  // TODO: Remove feature flag once we're ready to launch.
  const enablePageableArtworkScreens = useFeatureFlag("AREnablePageableArtworkScreens")
  const { activeScreen } = usePageableScreensContext() ?? {}

  useEffect(() => {
    if (enablePageableArtworkScreens) {
      if (activeScreen.name === artworkAboveTheFold?.slug) {
        onLoad(props)
      }
    } else {
      onLoad(props)
    }
  }, [artworkAboveTheFold?.slug, activeScreen?.name])

  // This is a hack to make useEffect behave exactly like didComponentUpdate.
  const firstUpdate = useRef(true)
  const previousIsVisible = usePrevious(isVisible)

  useLayoutEffect(() => {
    if (!isVisible || previousIsVisible) {
      return
    }

    if (firstUpdate.current) {
      firstUpdate.current = false
      return
    }

    markArtworkAsRecentlyViewed()
  })

  const onRefresh = (cb?: () => any) => {
    if (refreshing) {
      return
    }

    setRefreshing(true)

    relay.refetch(
      { artistID: internalID },
      null,
      () => {
        setRefreshing(false)
        cb?.()
      },
      {
        force: true,
      }
    )
  }

  const refetch = (cb?: () => any) => {
    relay.refetch(
      { artistID: internalID },
      null,
      () => {
        cb?.()
      },
      { force: true }
    )
  }

  const handleModalDismissed = () => {
    // If the deep zoom modal is visible, we don't want to refetch the artwork
    // This results in app crash, while testing. This wouldn't occur on Prod
    if (isDeepZoomModalVisible) {
      return
    }
    setFetchingData(true)
    refetch(() => setFetchingData(false))
    return true
  }

  const markArtworkAsRecentlyViewed = () => {
    commitMutation<ArtworkMarkAsRecentlyViewedQuery>(relay.environment, {
      mutation: graphql`
        mutation ArtworkMarkAsRecentlyViewedQuery($input: RecordArtworkViewInput!) {
          recordArtworkView(input: $input) {
            artworkId
          }
        }
      `,
      variables: {
        input: {
          artwork_id: slug || "",
        },
      },
    })
  }

  const sectionsData = (): ArtworkPageSection[] => {
    const sections: ArtworkPageSection[] = []

    if (artworkAboveTheFold) {
      if (enableAuctionHeaderAlertCTA) {
        sections.push({
          key: "auctionHeaderAlertCTA",
          element: <ArtworkAuctionCreateAlertHeader artwork={artworkAboveTheFold} />,
          excludeSeparator: true,
          excludeVerticalMargin: true,
          mt: 2,
        })
      }

      sections.push({
        key: "header",
        element: (
          <ArtworkHeader
            artwork={artworkAboveTheFold}
            refetchArtwork={() =>
              relay.refetch({ artworkID: internalID }, null, () => null, { force: true })
            }
          />
        ),
        excludePadding: true,
        excludeSeparator: true,
      })

      if ((artworkAboveTheFold.editionSets ?? []).length > 1) {
        sections.push({
          key: "selectEditionSet",
          element: <ArtworkEditionSetInformation artwork={artworkAboveTheFold} />,
          excludeSeparator: true,
        })
      }

      sections.push({
        key: "artworkDetails",
        element: <ArtworkDetails artwork={artworkAboveTheFold} />,
      })
    }

    if (isInAuction && artworkAboveTheFold?.sale && artworkAboveTheFold?.saleArtwork) {
      sections.push({
        key: "lotDetailsSection",
        element: (
          <ArtworkLotDetails
            artwork={artworkAboveTheFold}
            auctionState={auctionTimerState as AuctionTimerState}
          />
        ),
      })
    }

    if (!artworkBelowTheFold) {
      sections.push({
        key: "belowTheFoldPlaceholder",
        element: <BelowTheFoldPlaceholder />,
      })

      return sections
    }

    if (
      artworkBelowTheFold.provenance ||
      artworkBelowTheFold.exhibitionHistory ||
      artworkBelowTheFold.literature
    ) {
      sections.push({
        key: "history",
        element: <ArtworkHistory artwork={artworkBelowTheFold} />,
      })
    }

    if (artworkBelowTheFold.description || artworkBelowTheFold.additionalInformation) {
      sections.push({
        key: "aboutWork",
        element: <AboutWork artwork={artworkBelowTheFold} />,
      })
    }

    if (artist && artist.biographyBlurb) {
      sections.push({
        key: "aboutArtist",
        element: <AboutArtist artwork={artworkBelowTheFold} />,
      })
    }

    if (shouldRenderConsignmentsSection()) {
      sections.push({
        key: "consignments",
        element: <ArtworkConsignments artwork={artworkBelowTheFold} />,
      })
    }

    if (context && context.__typename === "Sale" && context.isAuction) {
      sections.push({
        key: "contextCard",
        element: <ContextCard artwork={artworkBelowTheFold} />,
      })
    }

    if (shouldRenderPartner()) {
      sections.push({
        key: "partnerCard",
        element: (
          <PartnerCard
            shouldShowQuestions={!!artworkBelowTheFold.partner?.isInquireable}
            artwork={artworkBelowTheFold}
          />
        ),
      })
    }

    if (!!(artworkBelowTheFold.isForSale && !isInAuction)) {
      sections.push({
        key: "shippingAndTaxes",
        element: <ShippingAndTaxesFragmentContainer artwork={artworkBelowTheFold} />,
      })
    }

    if (!!artworkBelowTheFold?.isEligibleForArtsyGuarantee) {
      sections.push({
        key: "artsyGuarantee",
        element: <ArtsyGuarantee />,
      })
    }

    if (shouldRenderArtworksInArtistSeries()) {
      sections.push({
        key: "artworksInSeriesRail",
        element: <ArtworksInSeriesRail artwork={artworkBelowTheFold} />,
      })
    }

    if (artworkAboveTheFold && shouldRenderArtistSeriesMoreSeries()) {
      sections.push({
        key: "artistSeriesMoreSeries",
        element: (
          <ArtistSeriesMoreSeries
            contextScreenOwnerId={artworkAboveTheFold.internalID}
            contextScreenOwnerSlug={artworkAboveTheFold.slug}
            contextScreenOwnerType={OwnerType.artwork}
            artist={artist}
            artistSeriesHeader="Series from this artist"
            headerVariant="md"
          />
        ),
      })
    }

    if (shouldRenderOtherWorks()) {
      sections.push({
        key: "otherWorks",
        element: <OtherWorks artwork={artworkBelowTheFold} />,
      })
    }

    return sections
  }

  const QAInfo = () => (
    <QAInfoPanel
      style={{ position: "absolute", top: 200, left: 10, backgroundColor: "grey" }}
      info={[["id", internalID || ""]]}
    />
  )

  if (fetchingData) {
    return (
      <ProvidePlaceholderContext>
        <AboveTheFoldPlaceholder />
      </ProvidePlaceholderContext>
    )
  }

  return (
    <>
      <FlatList<ArtworkPageSection>
        keyboardShouldPersistTaps="handled"
        data={sectionsData()}
        ItemSeparatorComponent={(props) => {
          const { leadingItem: item } = props

          if (item.excludeSeparator) {
            return <Box mt={item.excludeVerticalMargin ? 0 : 4} />
          }

          return (
            <Box mx={2} my={4}>
              <Separator />
            </Box>
          )
        }}
        keyExtractor={({ key }) => key}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: space(4) }}
        renderItem={({ item }) => {
          return (
            <Box px={item.excludePadding ? 0 : 2} mt={item.mt}>
              {item.element}
            </Box>
          )
        }}
      />

      {!!(artworkAboveTheFold && me) && (
        <ArtworkStickyBottomContent artwork={artworkAboveTheFold} me={me} />
      )}

      <QAInfo />
      <OfferSubmittedModal />
    </>
  )
}

interface ArtworkPageSection {
  key: string
  element: JSX.Element
  excludePadding?: boolean
  excludeSeparator?: boolean
  // use verticalMargin to pass custom spacing between separator and section
  verticalMargin?: SpacingUnit
  excludeVerticalMargin?: boolean
  mt?: SpacingUnit
}

const ArtworkProvidersContainer: React.FC<ArtworkProps> = (props) => {
  const { artworkAboveTheFold, artworkBelowTheFold } = props
  const { isInAuction } = artworkAboveTheFold || {}
  const { isPreview, isClosed, liveStartAt } = artworkAboveTheFold?.sale ?? {}
  const websocketEnabled = !!artworkBelowTheFold?.sale?.extendedBiddingIntervalMinutes

  const getInitialAuctionTimerState = () => {
    if (isInAuction) {
      return currentTimerState({
        isPreview: isPreview || undefined,
        isClosed: isClosed || undefined,
        liveStartsAt: liveStartAt || undefined,
      })
    }
  }

  const trackingInfo: Schema.PageView = {
    context_screen: Schema.PageNames.ArtworkPage,
    context_screen_owner_type: Schema.OwnerEntityTypes.Artwork,
    context_screen_owner_slug: artworkAboveTheFold?.slug,
    context_screen_owner_id: artworkAboveTheFold?.internalID,
    // @ts-ignore
    availability: artworkAboveTheFold?.availability,
    acquireable: artworkAboveTheFold?.isAcquireable,
    inquireable: artworkAboveTheFold?.isInquireable,
    offerable: artworkAboveTheFold?.isOfferable,
    biddable: artworkAboveTheFold?.isBiddable,
  }

  const socketChannelInfo: AuctionWebsocketChannelInfo = {
    channel: "SalesChannel",
    sale_id: artworkAboveTheFold?.sale?.internalID,
  }

  return (
    <ProvideScreenTracking info={trackingInfo}>
      <AnalyticsContextProvider
        contextScreenOwnerId={artworkAboveTheFold?.internalID}
        contextScreenOwnerSlug={artworkAboveTheFold?.slug}
        contextScreenOwnerType={OwnerType.artwork}
      >
        <AuctionWebsocketContextProvider channelInfo={socketChannelInfo} enabled={websocketEnabled}>
          <ArtworkStoreProvider
            runtimeModel={{
              ...artworkModel,
              auctionState: getInitialAuctionTimerState()!,
            }}
          >
            <ArtworkListsProvider>
              <Artwork {...props} />
            </ArtworkListsProvider>
          </ArtworkStoreProvider>
        </AuctionWebsocketContextProvider>
      </AnalyticsContextProvider>
    </ProvideScreenTracking>
  )
}

export const ArtworkContainer = createRefetchContainer(
  ArtworkProvidersContainer,
  {
    artworkAboveTheFold: graphql`
      fragment Artwork_artworkAboveTheFold on Artwork {
        ...ArtworkAuctionCreateAlertHeader_artwork
        ...ArtworkScreenHeader_artwork
        ...ArtworkHeader_artwork
        ...ArtworkLotDetails_artwork
        ...ArtworkStickyBottomContent_artwork
        ...ArtworkDetails_artwork
        ...ArtworkEditionSetInformation_artwork
        slug
        internalID
        isAcquireable
        isOfferable
        isBiddable
        isInquireable
        isInAuction
        availability
        sale {
          internalID
          isClosed
          isPreview
          liveStartAt
        }
        saleArtwork {
          internalID
        }
        editionSets {
          internalID
        }
      }
    `,
    artworkBelowTheFold: graphql`
      fragment Artwork_artworkBelowTheFold on Artwork {
        additionalInformation
        description
        provenance
        exhibitionHistory
        literature
        isForSale
        partner {
          type
          isInquireable
        }
        artist {
          biographyBlurb {
            text
          }
          artistSeriesConnection(first: 4) {
            totalCount
          }
          ...ArtistSeriesMoreSeries_artist
        }
        sale {
          isBenefit
          isGalleryAuction
          extendedBiddingIntervalMinutes
        }
        context {
          __typename
          ... on Sale {
            isAuction
          }
        }
        contextGrids {
          artworks: artworksConnection(first: 6) {
            edges {
              node {
                id
              }
            }
          }
        }
        artistSeriesConnection(first: 1) {
          edges {
            node {
              filterArtworksConnection(first: 20, input: { sort: "-decayed_merch" }) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        }
        artists {
          isConsignable
        }
        isEligibleForArtsyGuarantee
        ...PartnerCard_artwork
        ...AboutWork_artwork
        ...OtherWorks_artwork
        ...AboutArtist_artwork
        ...ContextCard_artwork
        ...ArtworkHistory_artwork
        ...ArtworksInSeriesRail_artwork
        ...ShippingAndTaxes_artwork
        ...ArtworkConsignments_artwork
      }
    `,
    me: graphql`
      fragment Artwork_me on Me {
        ...ArtworkStickyBottomContent_me
      }
    `,
  },
  graphql`
    query ArtworkRefetchQuery($artworkID: String!) {
      artwork(id: $artworkID) {
        ...Artwork_artworkAboveTheFold
        ...Artwork_artworkBelowTheFold
      }
    }
  `
)

export const ArtworkScreenQuery = graphql`
  query ArtworkAboveTheFoldQuery($artworkID: String!) {
    artwork(id: $artworkID) @principalField {
      ...Artwork_artworkAboveTheFold
    }
    me {
      ...Artwork_me
    }
  }
`

export const ArtworkQueryRenderer: React.FC<ArtworkPageableScreenProps> = ({
  artworkID,
  environment,
  ...others
}) => {
  return (
    <AboveTheFoldQueryRenderer<ArtworkAboveTheFoldQuery, ArtworkBelowTheFoldQuery>
      environment={environment || getRelayEnvironment()}
      above={{
        query: ArtworkScreenQuery,
        variables: { artworkID },
      }}
      below={{
        query: graphql`
          query ArtworkBelowTheFoldQuery($artworkID: String!) {
            artwork(id: $artworkID) {
              ...Artwork_artworkBelowTheFold
            }
          }
        `,
        variables: { artworkID },
      }}
      render={{
        renderPlaceholder: () => <AboveTheFoldPlaceholder artworkID={artworkID} />,
        renderComponent: ({ above, below }) => {
          return (
            <ArtworkContainer
              {...others}
              artworkAboveTheFold={above.artwork}
              artworkBelowTheFold={below?.artwork ?? null}
              me={above.me}
            />
          )
        },
      }}
      fetchPolicy="store-and-network"
      cacheConfig={{ force: true }}
    />
  )
}

interface ArtworkPageableScreenProps {
  artworkID: string
  isVisible: boolean
  pageableSlugs: string[]
  environment?: RelayModernEnvironment | RelayMockEnvironment
  tracking?: TrackingProp
  onLoad: ArtworkProps["onLoad"]
}

export const ArtworkPageableScreen: React.FC<ArtworkPageableScreenProps> = (props) => {
  const enablePageableArtworkScreens = useFeatureFlag("AREnablePageableArtworkScreens")
  const [artworkProps, setArtworkProps] = useState<ArtworkProps | null>(null)

  const pageableSlugs = props.pageableSlugs ?? []

  const screens = useMemo(() => {
    return pageableSlugs.map((slug) => ({
      name: slug,
      Component: () => (
        <ArtworkQueryRenderer
          {...props}
          artworkID={slug}
          onLoad={(props) => {
            setArtworkProps(props)
          }}
        />
      ),
    }))
  }, [JSON.stringify(pageableSlugs)])

  return (
    <>
      {!!artworkProps?.artworkAboveTheFold && (
        <ArtworkScreenHeader artwork={artworkProps.artworkAboveTheFold} />
      )}
      {/*
        Check to see if we're within the context of an artwork rail and show pager view.
        TODO: Remove feature flag once we're ready to launch.
      */}
      {enablePageableArtworkScreens && screens.length > 0 ? (
        <PageableScreensView
          screens={screens}
          initialScreenName={props.artworkID}
          prefetchScreensCount={5}
        />
      ) : (
        <ArtworkQueryRenderer {...props} onLoad={(props) => setArtworkProps(props)} />
      )}
    </>
  )
}
