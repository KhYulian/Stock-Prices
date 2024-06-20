import { ResponseWithPagination } from "../../../common/response-with-pagination";
import { Instrument } from "../instrument.entity";

export type GetInstrumentsResponse = ResponseWithPagination<Instrument>;
