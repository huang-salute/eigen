import { AverageSalePriceAtAuctionQuery } from "__generated__/AverageSalePriceAtAuctionQuery.graphql"
import OpaqueImageView from "app/Components/OpaqueImageView/OpaqueImageView"
import {
  PlaceholderBox,
  PlaceholderText,
  ProvidePlaceholderContext,
  RandomNumberGenerator,
} from "app/utils/placeholders"
import { Flex, NoArtworkIcon, Spacer, Text, Touchable } from "palette"
import React, { Suspense, useCallback, useState } from "react"
import { ScrollView } from "react-native"
import { graphql, useLazyLoadQuery } from "react-relay"
import { useScreenDimensions } from "shared/hooks"
import { AverageSalePriceSelectArtistModal } from "./AverageSalePriceSelectArtistModal"
import { MedianSalePriceChart } from "./MedianSalePriceChart/MedianSalePriceChart"

const PAGE_SIZE = 50

interface AverageSalePriceAtAuctionProps {
  refetch: (newArtistID: string) => void
  queryArgs: Record<string, any>
  initialCategory: string
}

const AverageSalePriceAtAuctionScreen: React.FC<AverageSalePriceAtAuctionProps> = ({
  refetch,
  queryArgs,
  initialCategory,
}) => {
  const [isVisible, setVisible] = useState<boolean>(false)

  const data = useLazyLoadQuery<AverageSalePriceAtAuctionQuery>(
    AverageSalePriceAtAuctionScreenQuery,
    queryArgs.variables,
    queryArgs.options
  )

  const enableChangeArtist =
    !!data.me?.myCollectionInfo?.artistsCount && data.me.myCollectionInfo.artistsCount > 1

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Flex mx={2} pt={6}>
        <Text variant="lg" mb={0.5} testID="Average_Auction_Price_title">
          Median Auction Price
        </Text>
        <Text variant="xs">Track price stability or growth for your artists.</Text>

        {/* Artists Info */}
        <Flex py={2} flexDirection="row" justifyContent="space-between" alignItems="center">
          <Flex
            width={40}
            height={40}
            borderRadius={20}
            backgroundColor="black10"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
            // To align the image with the text we have to add top margin to compensate the line height.
            style={{ marginTop: 3 }}
          >
            {data.artist?.imageUrl ? (
              <OpaqueImageView width={40} height={40} imageURL={data.artist.imageUrl} />
            ) : (
              <NoArtworkIcon width={28} height={28} opacity={0.3} />
            )}
          </Flex>
          {/* Sale Artwork Artist Name */}
          <Flex flex={1} pl={1}>
            {!!data.artist?.name && (
              <Text variant="md" ellipsizeMode="middle" numberOfLines={2}>
                {data.artist.name}
              </Text>
            )}
          </Flex>

          {!!enableChangeArtist && (
            <Touchable testID="change-artist-touchable" onPress={() => setVisible(true)} haptic>
              <Text style={{ textDecorationLine: "underline" }} variant="xs" color="black60">
                Change Artist
              </Text>
            </Touchable>
          )}
        </Flex>

        <MedianSalePriceChart
          artistId={queryArgs.variables.artistId}
          initialCategory={initialCategory}
          queryData={data}
        />

        <AverageSalePriceSelectArtistModal
          queryData={data}
          visible={isVisible}
          closeModal={() => setVisible(false)}
          onItemPress={(artistId) => {
            refetch(artistId)
            setVisible(false)
          }}
        />
      </Flex>
    </ScrollView>
  )
}

export const AverageSalePriceAtAuction: React.FC<{ artistID: string; initialCategory: string }> = ({
  artistID,
  initialCategory,
}) => {
  const end = new Date().getFullYear()
  const startYear = (end - 3).toString()
  const endYear = end.toString()

  const [queryArgs, setQueryArgs] = useState({
    options: { fetchKey: 0 },
    variables: {
      ...artistsQueryVariables,
      artistID,
      artistId: artistID,
      medium: initialCategory,
      endYear,
      startYear,
    },
  })

  const refetch = useCallback(
    (newArtistID) => {
      if (newArtistID !== queryArgs.variables.artistID) {
        setQueryArgs((prev) => ({
          options: { fetchKey: (prev?.options.fetchKey ?? 0) + 1 },
          variables: { ...queryArgs.variables, artistID: newArtistID, artistId: newArtistID },
        }))
      }
    },
    [queryArgs.variables.artistID]
  )

  return (
    <ProvidePlaceholderContext>
      <Suspense fallback={<LoadingSkeleton />}>
        <AverageSalePriceAtAuctionScreen
          refetch={refetch}
          queryArgs={queryArgs}
          initialCategory={initialCategory}
        />
      </Suspense>
    </ProvidePlaceholderContext>
  )
}

export const AverageSalePriceAtAuctionScreenQuery = graphql`
  query AverageSalePriceAtAuctionQuery(
    $artistID: String!
    $artistId: ID!
    $count: Int
    $after: String
    $endYear: String
    $startYear: String
    $medium: String!
  ) {
    ...AverageSalePriceSelectArtistModal_myCollectionInfo @arguments(count: $count, after: $after)
    ...MedianSalePriceChart_query
      @arguments(artistId: $artistId, endYear: $endYear, medium: $medium, startYear: $startYear)
    artist(id: $artistID) {
      internalID
      name
      imageUrl
    }
    me {
      myCollectionInfo {
        artistsCount
      }
    }
  }
`

export const artistsQueryVariables = {
  count: PAGE_SIZE,
}

const LoadingSkeleton = () => {
  const { height: screenHeight } = useScreenDimensions()
  const rng = new RandomNumberGenerator(100)
  return (
    <Flex mx={2} pt={6}>
      <Text variant="lg" mb={0.5}>
        Average Auction Price
      </Text>
      <Text variant="xs">Track price stability or growth for your artists.</Text>

      <Flex py={2} flexDirection="row" justifyContent="space-between" alignItems="center">
        <Flex flexDirection="row" alignItems="center">
          <Flex
            width={40}
            height={40}
            borderRadius={20}
            backgroundColor="black10"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
            style={{ marginTop: 3 }}
          />
          <Spacer p={1} />
          <PlaceholderText width={150} height={10} marginTop={5} />
        </Flex>

        <PlaceholderText width={70} height={10} marginTop={5} />
      </Flex>
      <Spacer mb={0.5} />
      <PlaceholderText width={30} height={20} />
      <Flex flexDirection="row" alignItems="center" my={0.1}>
        <PlaceholderBox width={10} height={10} borderRadius={5} marginRight={7} />
        <PlaceholderText width={60} height={7} marginTop={5} />
      </Flex>
      <PlaceholderText width={100} height={7} />
      <Spacer mb={2} />
      <PlaceholderBox width="100%" height={screenHeight / 4} marginVertical={10} />
      <Flex flexDirection="row" my={25} justifyContent="center">
        <PlaceholderBox height={15} width={25} marginHorizontal={10} />
        <PlaceholderBox height={15} width={25} marginHorizontal={10} />
      </Flex>

      <Flex>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => {
            const w = rng.next() * 100 + 100
            return (
              <PlaceholderBox
                key={`${c}`}
                width={w}
                height={25}
                borderRadius={10}
                marginRight={10}
              />
            )
          })}
        </ScrollView>
      </Flex>
    </Flex>
  )
}
