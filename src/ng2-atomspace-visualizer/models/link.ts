/**
 * Created by tsadik on 11/8/17.
 */

export interface Link {
  id: string;
  name: string;
  type?: string;
  av: any;
  tv: any;
  incoming: number [];
  outgoing: number [];
  source: string;
  target: string;
}
