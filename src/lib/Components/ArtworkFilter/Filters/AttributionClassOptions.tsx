import { StackScreenProps } from "@react-navigation/stack"
import { FilterData, FilterDisplayName, FilterParamName } from "lib/Components/ArtworkFilter/ArtworkFilterHelpers"
import React from "react"
import { ArtworkFilterNavigationStack } from "lib/Components/ArtworkFilter"
import { MultiSelectOptionScreen } from "./MultiSelectOption"
import { useMultiSelect } from "./useMultiSelect"

interface AttributionClassOptionsScreenProps
  extends StackScreenProps<ArtworkFilterNavigationStack, "AttributionClassOptionsScreen"> {}

export const ATTRIBUTION_CLASS_OPTIONS: FilterData[] = [
  { displayText: "Unique", paramValue: "unique", paramName: FilterParamName.attributionClass },
  { displayText: "Limited Edition", paramValue: "limited edition", paramName: FilterParamName.attributionClass },
  { displayText: "Open Edition", paramValue: "open edition", paramName: FilterParamName.attributionClass },
  { displayText: "Unknown Edition", paramValue: "unknown edition", paramName: FilterParamName.attributionClass },
]

export const AttributionClassOptionsScreen: React.FC<AttributionClassOptionsScreenProps> = ({ navigation }) => {
  const { handleSelect, isSelected } = useMultiSelect({
    options: ATTRIBUTION_CLASS_OPTIONS,
    paramName: FilterParamName.attributionClass,
  })

  const filterOptions = ATTRIBUTION_CLASS_OPTIONS.map((option) => ({
    ...option,
    paramValue: isSelected(option),
  }))

  return (
    <MultiSelectOptionScreen
      onSelect={handleSelect}
      filterHeaderText={FilterDisplayName.attributionClass}
      filterOptions={filterOptions}
      navigation={navigation}
    />
  )
}
