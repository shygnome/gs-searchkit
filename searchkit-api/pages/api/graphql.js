import { ApolloServer, gql } from "apollo-server-micro";
import {
  MultiMatchQuery,
  SearchkitSchema,
  DateRangeFacet,
  RefinementSelectFacet,
} from "@searchkit/schema";
import cors from "micro-cors";

const searchkitConfig = {
  host: process.env.ES_HOST || "http://localhost:9200",
  index: "kibana_sample_data_flights",
  hits: {
    fields: [
      "Carrier",
      "FlightNum",
      "Dest",
      "Origin",
      "DestCountry",
      "OriginCountry",
      "DestWeather",
      "OriginWeather",
    ],
  },
  sortOptions: [
    { id: 'relevance', label: "Relevance", field: [{"_score": "desc"}], defaultOption: true},
    { id: 'timestamp', label: "Timestamp", field: [{"timestamp": "desc"}]},
  ],
  query: new MultiMatchQuery({
    fields: [
      "Carrier",
      "FlightNum",
      "Dest",
      "Origin",
      "DestCountry",
      "OriginCountry",
      "DestWeather",
      "OriginWeather",
    ],
  }),
  facets: [
    new RefinementSelectFacet({
      field: 'Carrier.keyword',
      identifier: 'Carrier',
      label: 'Carrier',
      display: 'ComboBoxFacet'
    }),
    new DateRangeFacet({
      field: "timestamp",
      identifier: "timestamp",
      label: "Timestamp",
    }),
  ],
};

// Returns SDL + Resolvers for searchkit, based on the Searchkit config
const { typeDefs, withSearchkitResolvers, context } = SearchkitSchema({
  config: searchkitConfig, // searchkit configuration
  typeName: "ResultSet", // type name for Searchkit Root
  hitTypeName: "ResultHit", // type name for each search result
  addToQueryType: true, // When true, adds a field called results to Query type
});

export const config = {
  api: {
    bodyParser: false,
  },
};

const server = new ApolloServer({
  typeDefs: [
    gql`
      type Query {
        root: String
      }

      type HitFields {
        root: String
        Carrier: String
        FlightNum: String
        Dest: String
        Origin: String
        DestCountry: String
        OriginCountry: String
        DestWeather: String
        OriginWeather: String
      }

      type ResultHit implements SKHit {
        id: ID!
        fields: HitFields
      }
    `,
    ...typeDefs,
  ],
  resolvers: withSearchkitResolvers({}),
  introspection: true,
  playground: true,
  context: {
    ...context,
  },
});

const handler = server.createHandler({ path: "/api/graphql" });

export default cors()((req, res) =>
  req.method === "OPTIONS" ? res.end() : handler(req, res)
);
