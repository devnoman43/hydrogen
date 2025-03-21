import { type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { Await, useLoaderData, Link, type MetaFunction } from '@remix-run/react';
import { Suspense, useState, useEffect } from 'react';
import { Image, Money } from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';

// Define the MoneyV2 type
type MoneyV2 = {
  amount: string;
  currencyCode: string;
};

// Define the PriceRange type
type PriceRange = {
  minVariantPrice: MoneyV2;
  maxVariantPrice: MoneyV2;
};

// Define the Product type
type Product = {
  id: string;
  title: string;
  handle: string;
  priceRange: PriceRange;
  vendor: string;
  compareAtPriceRange: PriceRange;
  images: {
    nodes: {
      id: string;
      url: string;
      altText: string;
      width: number;
      height: number;
    }[];
  };
  variants: {
    nodes: {
      id: string;
      selectedOptions: {
        name: string;
        value: string;
      }[];
      image: {
        url: string;
        altText: string;
      };
    }[];
  };
};

// Define the RecommendedProductsQuery type
type RecommendedProductsQuery = {
  products: {
    nodes: Product[];
  };
};

export const meta: MetaFunction = () => {
  return [{ title: 'Hydrogen | Home' }];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const deferredData = loadDeferredData({ context });
  const criticalData = await loadCriticalData({ context });
  return { ...deferredData, ...criticalData };
}

async function loadCriticalData({ context }: LoaderFunctionArgs) {
  const [{ collections }] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
  ]);
  return {
    featuredCollection: collections.nodes[0],
  };
}

function loadDeferredData({ context }: LoaderFunctionArgs) {
  const recommendedProducts = context.storefront
    .query<RecommendedProductsQuery>(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error) => {
      console.error(error);
      return null;
    });
  return {
    recommendedProducts,
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="home">
      <FeaturedCollection collection={data.featuredCollection} />
      <RecommendedProducts products={data.recommendedProducts} />
    </div>
  );
}

function FeaturedCollection({
  collection,
}: {
  collection: FeaturedCollectionFragment;
}) {
  if (!collection) return null;
  const image = collection?.image;
  return (
    <Link className="featured-collection" to={`/collections/${collection.handle}`}>
      {image && (
        <div className="featured-collection-image">
          <Image data={image} sizes="100vw" />
        </div>
      )}
      {/* <h1>{collection.title}</h1> */}
    </Link>
  );
}

function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <div className="recommended-products">
   
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={products}>
          {(response) => (
            <div className="recommended-products-grid " >
              {response
                ? response.products.nodes.map((product) => (
                    <ProductWithSwatches key={product.id} product={product} />
                  ))
                : null}
            </div>
          )}
        </Await>
      </Suspense>
      <br />
    </div>
  );
}

function ProductWithSwatches({ product }: { product: Product }) {
  const [selectedImage, setSelectedImage] = useState(product.images.nodes[0].url);
  const [selectedAltText, setSelectedAltText] = useState(product.images.nodes[0].altText);
  const [secondaryImageUrl, setSecondaryImageUrl] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  // Extract color options from variants
  const colorOptions = product.variants.nodes
    .map((variant) => {
      const colorOption = variant.selectedOptions.find(
        (option) => option.name === 'Color'
      );
      return colorOption
        ? {
            value: colorOption.value,
            image: variant.image.url,
            altText: variant.image.altText,
          }
        : null;
    })
    .filter(Boolean) as { value: string; image: string; altText: string }[];

  // Initialize selectedColor to the value of the 0th index swatch
  const [selectedColor, setSelectedColor] = useState<string | null>(
    colorOptions[0]?.value || null
  );

  // Handle color swatch click
  const handleColorSwatchClick = (imageUrl: string, altText: string, colorValue: string) => {
    setSelectedImage(imageUrl);
    setSelectedAltText(altText);
    setSelectedColor(colorValue);
    const secondaryUrl = getSecondaryImageUrl(altText);
    setSecondaryImageUrl(secondaryUrl);
  };

  // Handle color swatch hover
  const handleColorSwatchHover = (imageUrl: string, altText: string, colorValue: string) => {
    setSelectedImage(imageUrl);
    setSelectedAltText(altText);
    setHoveredColor(colorValue);
    const secondaryUrl = getSecondaryImageUrl(altText);
    setSecondaryImageUrl(secondaryUrl);
  };

  // Handle color swatch leave
  const handleColorSwatchLeave = () => {
    if (selectedColor) {
      const selectedColorOption = colorOptions.find(option => option.value === selectedColor);
      if (selectedColorOption) {
        setSelectedImage(selectedColorOption.image);
        setSelectedAltText(selectedColorOption.altText);
        const secondaryUrl = getSecondaryImageUrl(selectedColorOption.altText);
        setSecondaryImageUrl(secondaryUrl);
      }
    }
    setHoveredColor(null);
  };

  // Get the secondary image URL based on the selected image's altText
  const getSecondaryImageUrl = (altText: string) => {
    const secondaryImage = product.images.nodes.find(
      (image) => image.altText === `${altText}-secondary`
    );
    return secondaryImage ? secondaryImage.url : selectedImage;
  };

  // Update the secondary image URL whenever the selected image changes
  useEffect(() => {
    const secondaryUrl = getSecondaryImageUrl(selectedAltText);
    setSecondaryImageUrl(secondaryUrl);
  }, [selectedAltText]);

  return (
    <div className="recommended-product">
      <span></span>
      <div
        className="relative productItem rounded-[10px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="absolute badge z-2 left-[10px] top-[10px] md:top-[15px]  font-bold md:left-[15px] rounded-[25px] border-1 text-[#FF0000] border-[#FF0000] text-center text-[12px] justify-center flex items-center">
          On Sale!
        </span>
        <Link className="no-underline cursor-pointer itemLink" to={`/products/${product.handle}`}>
          <Image
            className="featuredImage object-contain"
            data={{
              url: isHovered ? secondaryImageUrl : selectedImage,
              altText: selectedAltText,
            }}
            aspectRatio="1/1"
            sizes="(min-width: 45em) 20vw, 50vw"
          />
        </Link>
      </div>
      <div style={{
           margin: '14px 0px'
      }} className="color-swatches flex gap-2 ">
        {colorOptions.map((color, index) => (
          <button
            key={index}
            className={`w-6 h-6 swatchItem cursor-pointer rounded-full border border-gray-300 ${
              selectedColor === color.value ? 'active' : ''
            }`}
            style={{ backgroundColor: color.value }}
            onClick={() => handleColorSwatchClick(color.image, color.altText, color.value)}
            onMouseEnter={() => handleColorSwatchHover(color.image, color.altText, color.value)}
            onMouseLeave={handleColorSwatchLeave}
            aria-label={color.altText}
          />
        ))}
      </div>
      <h5  style={{
          margin: '0px 0px 0px 0px'
      }} className="text-[14px] mb-[0px] p-[0px]">{product.vendor}</h5>
      <h4  style={{
        margin: '2px 0px'
      }} className="text-[16px] m-0 p-0 font-bold text-[#0A4874]">{product.title}</h4>
      <small style={{
        flexDirection: 'row-reverse'
      }} className="flex  text-[14px] items-center justify-end">
        <Money className="text-[14px] text-[#FF0000]" data={product.priceRange.minVariantPrice} />
        {product.compareAtPriceRange.minVariantPrice.amount && (
          <span className="text-gray-500 mr-2">
            <Money className="line-through text-[14px] text-black" data={product.compareAtPriceRange.minVariantPrice} />
          </span>
        )}
      </small>
    </div>
  );
}
const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    vendor
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 20) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    variants(first: 10) {
      nodes {
        id
        selectedOptions {
          name
          value
        }
        image {
          url
          altText
        }
      }
    }
  }
  query RecommendedProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;