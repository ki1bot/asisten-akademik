package main

import (
	"bytes"
	"encoding/json"
)

type Optional[T any] struct {
	Set   bool
	Null  bool
	Value T
}

func (o *Optional[T]) UnmarshalJSON(data []byte) error {
	o.Set = true

	if bytes.Equal(bytes.TrimSpace(data), []byte("null")) {
		o.Null = true

		var zero T
		o.Value = zero

		return nil
	}

	return json.Unmarshal(data, &o.Value)
}
